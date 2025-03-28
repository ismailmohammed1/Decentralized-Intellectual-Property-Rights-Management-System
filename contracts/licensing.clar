;; licensing.clar
;; Manages usage rights and royalty agreements

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map licenses
  { license-id: uint }
  {
    ip-id: uint,
    licensor: principal,
    licensee: principal,
    start-block: uint,
    end-block: uint,
    royalty-rate: uint,
    is-exclusive: bool,
    license-type: (string-utf8 64),
    terms: (string-utf8 1024),
    active: bool
  }
)
(define-data-var next-license-id uint u1)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-LICENSE-EXISTS u101)
(define-constant ERR-LICENSE-NOT-FOUND u102)
(define-constant ERR-IP-NOT-FOUND u103)
(define-constant ERR-LICENSE-EXPIRED u104)
(define-constant ERR-INVALID-INPUT u105)

;; Read-only functions
(define-read-only (get-license (license-id uint))
  (map-get? licenses { license-id: license-id })
)

(define-read-only (is-license-active (license-id uint))
  (match (map-get? licenses { license-id: license-id })
    license (and
              (get active license)
              (>= block-height (get start-block license))
              (<= block-height (get end-block license))
            )
    false
  )
)

;; Public functions
(define-public (create-license (ip-id uint)
                              (licensee principal)
                              (duration uint)
                              (royalty-rate uint)
                              (is-exclusive bool)
                              (license-type (string-utf8 64))
                              (terms (string-utf8 1024)))
  (let (
    (license-id (var-get next-license-id))
    (start-block block-height)
    (end-block (+ block-height duration))
  )
    ;; Create the license
    (map-set licenses
      { license-id: license-id }
      {
        ip-id: ip-id,
        licensor: tx-sender,
        licensee: licensee,
        start-block: start-block,
        end-block: end-block,
        royalty-rate: royalty-rate,
        is-exclusive: is-exclusive,
        license-type: license-type,
        terms: terms,
        active: true
      }
    )
    ;; Increment the license ID counter
    (var-set next-license-id (+ license-id u1))
    (ok license-id)
  )
)

(define-public (terminate-license (license-id uint))
  (let ((license (unwrap! (map-get? licenses { license-id: license-id }) (err ERR-LICENSE-NOT-FOUND))))
    ;; Check if caller is the licensor
    (if (is-eq tx-sender (get licensor license))
      (begin
        (map-set licenses
          { license-id: license-id }
          (merge license { active: false })
        )
        (ok true)
      )
      (err ERR-NOT-AUTHORIZED)
    )
  )
)

(define-public (transfer-license (license-id uint) (new-licensee principal))
  (let ((license (unwrap! (map-get? licenses { license-id: license-id }) (err ERR-LICENSE-NOT-FOUND))))
    ;; Check if caller is the current licensee
    (if (is-eq tx-sender (get licensee license))
      (begin
        (map-set licenses
          { license-id: license-id }
          (merge license { licensee: new-licensee })
        )
        (ok true)
      )
      (err ERR-NOT-AUTHORIZED)
    )
  )
)

;; Admin functions
(define-public (set-admin (new-admin principal))
  (if (is-eq tx-sender (var-get admin))
    (begin
      (var-set admin new-admin)
      (ok true)
    )
    (err ERR-NOT-AUTHORIZED)
  )
)

