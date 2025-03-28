import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract environment
const mockBlockHeight = 100
let mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockUsageEvents = new Map()
const mockUsageTotals = new Map()
let mockNextUsageId = 1

// Mock contract functions
const usageTracking = {
  getUsageEvent: (usageId: number) => {
    return mockUsageEvents.get(usageId) || null
  },
  
  getUsageTotal: (licenseId: number) => {
    return mockUsageTotals.get(licenseId) || { totalUsage: 0 }
  },
  
  recordUsage: (licenseId: number, ipId: number, usageType: string, usageAmount: number, metadata: string) => {
    const usageId = mockNextUsageId
    
    mockUsageEvents.set(usageId, {
      licenseId,
      ipId,
      user: mockTxSender,
      usageType,
      usageAmount,
      timestamp: mockBlockHeight,
      metadata,
    })
    
    // Update usage totals
    const currentTotal = usageTracking.getUsageTotal(licenseId).totalUsage
    mockUsageTotals.set(licenseId, { totalUsage: currentTotal + usageAmount })
    
    mockNextUsageId++
    return { value: usageId }
  },
  
  bulkRecordUsage: (licenseId: number, ipId: number, usageType: string, usageAmount: number, metadata: string) => {
    if (mockTxSender !== mockAdmin) {
      return { error: 100 } // ERR-NOT-AUTHORIZED
    }
    
    return usageTracking.recordUsage(licenseId, ipId, usageType, usageAmount, metadata)
  },
}

describe("Usage Tracking Contract", () => {
  beforeEach(() => {
    // Reset the mock state
    mockUsageEvents.clear()
    mockUsageTotals.clear()
    mockNextUsageId = 1
    mockTxSender = mockAdmin
  })
  
  it("should record usage of licensed IP", () => {
    const result = usageTracking.recordUsage(
        1, // license ID
        2, // IP ID
        "stream", // usage type
        1, // usage amount
        "User streamed content on platform XYZ",
    )
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(1)
    
    const usageEvent = usageTracking.getUsageEvent(1)
    expect(usageEvent).not.toBeNull()
    expect(usageEvent.licenseId).toBe(1)
    expect(usageEvent.usageType).toBe("stream")
    expect(usageEvent.usageAmount).toBe(1)
    
    // Check that usage total was updated
    const usageTotal = usageTracking.getUsageTotal(1)
    expect(usageTotal.totalUsage).toBe(1)
  })
  
  it("should accumulate usage totals correctly", () => {
    // Record multiple usage events for the same license
    usageTracking.recordUsage(1, 2, "stream", 1, "First stream")
    usageTracking.recordUsage(1, 2, "stream", 1, "Second stream")
    usageTracking.recordUsage(1, 2, "download", 1, "Download")
    
    // Check that usage total was updated correctly
    const usageTotal = usageTracking.getUsageTotal(1)
    expect(usageTotal.totalUsage).toBe(3)
  })
  
  it("should allow bulk recording by admin", () => {
    const result = usageTracking.bulkRecordUsage(
        1, // license ID
        2, // IP ID
        "stream", // usage type
        100, // usage amount
        "Bulk recording of streams from platform XYZ",
    )
    
    expect(result).toHaveProperty("value")
    
    // Check that usage total was updated
    const usageTotal = usageTracking.getUsageTotal(1)
    expect(usageTotal.totalUsage).toBe(100)
  })
  
  it("should prevent bulk recording by non-admin", () => {
    mockTxSender = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    
    const result = usageTracking.bulkRecordUsage(
        1, // license ID
        2, // IP ID
        "stream", // usage type
        100, // usage amount
        "Bulk recording of streams from platform XYZ",
    )
    
    expect(result).toHaveProperty("error")
    expect(result.error).toBe(100) // ERR-NOT-AUTHORIZED
    
    // Usage total should remain unchanged
    const usageTotal = usageTracking.getUsageTotal(1)
    expect(usageTotal.totalUsage).toBe(0)
  })
})

