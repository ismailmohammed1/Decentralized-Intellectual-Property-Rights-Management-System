import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract environment
const mockBlockHeight = 100
let mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockIPs = new Map()
let mockNextIpId = 1

// Mock contract functions
const ipRegistration = {
  getIp: (ipId: number) => {
    return mockIPs.get(ipId) || null
  },
  
  isIpOwner: (ipId: number, owner: string) => {
    const ip = mockIPs.get(ipId)
    return ip ? ip.owner === owner : false
  },
  
  registerIp: (title: string, description: string, contentHash: string, ipType: string) => {
    const ipId = mockNextIpId
    
    mockIPs.set(ipId, {
      title,
      description,
      contentHash,
      creator: mockTxSender,
      owner: mockTxSender,
      creationBlock: mockBlockHeight,
      registrationBlock: mockBlockHeight,
      ipType,
    })
    
    mockNextIpId++
    return { value: ipId }
  },
  
  transferOwnership: (ipId: number, newOwner: string) => {
    const ip = mockIPs.get(ipId)
    if (!ip) {
      return { error: 102 } // ERR-IP-NOT-FOUND
    }
    
    if (ip.owner !== mockTxSender) {
      return { error: 100 } // ERR-NOT-AUTHORIZED
    }
    
    ip.owner = newOwner
    mockIPs.set(ipId, ip)
    return { value: true }
  },
}

describe("IP Registration Contract", () => {
  beforeEach(() => {
    // Reset the mock state
    mockIPs.clear()
    mockNextIpId = 1
    mockTxSender = mockAdmin
  })
  
  it("should register new intellectual property", () => {
    const result = ipRegistration.registerIp(
        "Digital Artwork: Sunset",
        "A digital painting of a sunset over the ocean",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "artwork",
    )
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(1)
    
    const ip = ipRegistration.getIp(1)
    expect(ip).not.toBeNull()
    expect(ip.title).toBe("Digital Artwork: Sunset")
    expect(ip.ipType).toBe("artwork")
    expect(ip.owner).toBe(mockTxSender)
    expect(ip.creator).toBe(mockTxSender)
  })
  
  it("should transfer ownership of intellectual property", () => {
    // First register IP
    ipRegistration.registerIp(
        "Digital Artwork: Sunset",
        "A digital painting of a sunset over the ocean",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "artwork",
    )
    
    // Then transfer ownership
    const newOwner = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const result = ipRegistration.transferOwnership(1, newOwner)
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(true)
    
    const ip = ipRegistration.getIp(1)
    expect(ip.owner).toBe(newOwner)
    // Creator should remain unchanged
    expect(ip.creator).toBe(mockTxSender)
  })
  
  it("should prevent unauthorized transfer of ownership", () => {
    // First register IP
    ipRegistration.registerIp(
        "Digital Artwork: Sunset",
        "A digital painting of a sunset over the ocean",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "artwork",
    )
    
    // Non-owner tries to transfer
    mockTxSender = "ST3YFNDD1VY183JJGR09BKWJZMHZ0YPJAXN79YJB"
    const newOwner = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const result = ipRegistration.transferOwnership(1, newOwner)
    
    expect(result).toHaveProperty("error")
    expect(result.error).toBe(100) // ERR-NOT-AUTHORIZED
    
    // Ownership should remain unchanged
    const ip = ipRegistration.getIp(1)
    expect(ip.owner).toBe(mockAdmin)
  })
  
  it("should correctly check if a principal is the IP owner", () => {
    // Register IP
    ipRegistration.registerIp(
        "Digital Artwork: Sunset",
        "A digital painting of a sunset over the ocean",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "artwork",
    )
    
    expect(ipRegistration.isIpOwner(1, mockTxSender)).toBe(true)
    expect(ipRegistration.isIpOwner(1, "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")).toBe(false)
    
    // Transfer ownership
    ipRegistration.transferOwnership(1, "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    
    expect(ipRegistration.isIpOwner(1, mockTxSender)).toBe(false)
    expect(ipRegistration.isIpOwner(1, "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")).toBe(true)
  })
})

