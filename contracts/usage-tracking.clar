;; usage-tracking.clar
;; Monitors utilization of licensed intellectual property

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map usage-events
  { usage-id: uint }
  {
    license-id: uint,
    ip-id: uint,
    user: principal,
    usage-type: (string-utf8 64),
    usage-amount: uint,
    timestamp: uint,
    metadata: (string-utf8 1024)
  }
)

(define-map usage-totals
  { license-id: uint }
  { total-usage: uint }
)

(define-data-var next-usage-id uint u1)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-USAGE-NOT-FOUND u101)
(define-constant ERR-LICENSE-NOT-FOUND u102)
(define-constant ERR-LICENSE-INACTIVE u103)
(define-constant ERR-INVALID-INPUT u104)

;; Read-only functions
(define-read-only (get-usage-event (usage-id uint))
  (map-get? usage-events { usage-id: usage-id })
)

(define-read-only (get-usage-total (license-id uint))
  (default-to { total-usage: u0 } (map-get? usage-totals { license-id: license-id }))
)

;; Public functions
(define-public (record-usage (license-id uint)
                            (ip-id uint)
                            (usage-type (string-utf8 64))
                            (usage-amount uint)
                            (metadata (string-utf8 1024)))
  (let (
    (usage-id (var-get next-usage-id))
    (current-total (get total-usage (get-usage-total license-id)))
  )
    ;; Record the usage event
    (map-set usage-events
      { usage-id: usage-id }
      {
        license-id: license-id,
        ip-id: ip-id,
        user: tx-sender,
        usage-type: usage-type,
        usage-amount: usage-amount,
        timestamp: block-height,
        metadata: metadata
      }
    )

    ;; Update usage totals
    (map-set usage-totals
      { license-id: license-id }
      { total-usage: (+ current-total usage-amount) }
    )

    ;; Increment the usage ID counter
    (var-set next-usage-id (+ usage-id u1))
    (ok usage-id)
  )
)

(define-public (bulk-record-usage (license-id uint)
                                 (ip-id uint)
                                 (usage-type (string-utf8 64))
                                 (usage-amount uint)
                                 (metadata (string-utf8 1024)))
  ;; For bulk recording by authorized parties (e.g., platforms)
  (if (is-eq tx-sender (var-get admin))
    (record-usage license-id ip-id usage-type usage-amount metadata)
    (err ERR-NOT-AUTHORIZED)
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

