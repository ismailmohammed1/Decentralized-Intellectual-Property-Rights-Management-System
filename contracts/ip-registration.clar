;; ip-registration.clar
;; Records ownership of creative works and inventions

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map intellectual-properties
  { ip-id: uint }
  {
    title: (string-utf8 256),
    description: (string-utf8 1024),
    content-hash: (buff 32),
    creator: principal,
    owner: principal,
    creation-block: uint,
    registration-block: uint,
    ip-type: (string-utf8 64)
  }
)
(define-data-var next-ip-id uint u1)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-IP-EXISTS u101)
(define-constant ERR-IP-NOT-FOUND u102)
(define-constant ERR-INVALID-INPUT u103)

;; Read-only functions
(define-read-only (get-ip (ip-id uint))
  (map-get? intellectual-properties { ip-id: ip-id })
)

(define-read-only (is-ip-owner (ip-id uint) (owner principal))
  (match (map-get? intellectual-properties { ip-id: ip-id })
    ip (is-eq owner (get owner ip))
    false
  )
)

;; Public functions
(define-public (register-ip (title (string-utf8 256))
                           (description (string-utf8 1024))
                           (content-hash (buff 32))
                           (ip-type (string-utf8 64)))
  (let (
    (ip-id (var-get next-ip-id))
  )
    ;; Register the IP
    (map-set intellectual-properties
      { ip-id: ip-id }
      {
        title: title,
        description: description,
        content-hash: content-hash,
        creator: tx-sender,
        owner: tx-sender,
        creation-block: block-height,
        registration-block: block-height,
        ip-type: ip-type
      }
    )
    ;; Increment the IP ID counter
    (var-set next-ip-id (+ ip-id u1))
    (ok ip-id)
  )
)

(define-public (transfer-ownership (ip-id uint) (new-owner principal))
  (let ((ip (unwrap! (map-get? intellectual-properties { ip-id: ip-id }) (err ERR-IP-NOT-FOUND))))
    ;; Check if caller is the current owner
    (if (is-eq tx-sender (get owner ip))
      (begin
        (map-set intellectual-properties
          { ip-id: ip-id }
          (merge ip { owner: new-owner })
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

