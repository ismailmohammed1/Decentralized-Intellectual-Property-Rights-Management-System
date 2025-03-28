import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract environment
const mockBlockHeight = 100
let mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockLicenses = new Map()
let mockNextLicenseId = 1

// Mock contract functions
const licensing = {
  getLicense: (licenseId: number) => {
    return mockLicenses.get(licenseId) || null
  },
  
  isLicenseActive: (licenseId: number) => {
    const license = mockLicenses.get(licenseId)
    if (!license) return false
    
    return license.active && mockBlockHeight >= license.startBlock && mockBlockHeight <= license.endBlock
  },
  
  createLicense: (
      ipId: number,
      licensee: string,
      duration: number,
      royaltyRate: number,
      isExclusive: boolean,
      licenseType: string,
      terms: string,
  ) => {
    const licenseId = mockNextLicenseId
    
    mockLicenses.set(licenseId, {
      ipId,
      licensor: mockTxSender,
      licensee,
      startBlock: mockBlockHeight,
      endBlock: mockBlockHeight + duration,
      royaltyRate,
      isExclusive,
      licenseType,
      terms,
      active: true,
    })
    
    mockNextLicenseId++
    return { value: licenseId }
  },
  
  terminateLicense: (licenseId: number) => {
    const license = mockLicenses.get(licenseId)
    if (!license) {
      return { error: 102 } // ERR-LICENSE-NOT-FOUND
    }
    
    if (license.licensor !== mockTxSender) {
      return { error: 100 } // ERR-NOT-AUTHORIZED
    }
    
    license.active = false
    mockLicenses.set(licenseId, license)
    return { value: true }
  },
  
  transferLicense: (licenseId: number, newLicensee: string) => {
    const license = mockLicenses.get(licenseId)
    if (!license) {
      return { error: 102 } // ERR-LICENSE-NOT-FOUND
    }
    
    if (license.licensee !== mockTxSender) {
      return { error: 100 } // ERR-NOT-AUTHORIZED
    }
    
    license.licensee = newLicensee
    mockLicenses.set(licenseId, license)
    return { value: true }
  },
}

describe("Licensing Contract", () => {
  beforeEach(() => {
    // Reset the mock state
    mockLicenses.clear()
    mockNextLicenseId = 1
    mockTxSender = mockAdmin
  })
  
  it("should create a new license", () => {
    const result = licensing.createLicense(
        1, // IP ID
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", // licensee
        1000, // duration
        500, // royalty rate (5%)
        false, // not exclusive
        "commercial", // license type
        "Standard commercial license for digital reproduction",
    )
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(1)
    
    const license = licensing.getLicense(1)
    expect(license).not.toBeNull()
    expect(license.ipId).toBe(1)
    expect(license.licensor).toBe(mockTxSender)
    expect(license.licensee).toBe("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
    expect(license.active).toBe(true)
  })
  
  it("should terminate a license", () => {
    // First create a license
    licensing.createLicense(
        1, // IP ID
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", // licensee
        1000, // duration
        500, // royalty rate (5%)
        false, // not exclusive
        "commercial", // license type
        "Standard commercial license for digital reproduction",
    )
    
    // Then terminate it
    const result = licensing.terminateLicense(1)
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(true)
    
    const license = licensing.getLicense(1)
    expect(license.active).toBe(false)
  })
  
  it("should prevent unauthorized termination of a license", () => {
    // First create a license
    licensing.createLicense(
        1, // IP ID
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", // licensee
        1000, // duration
        500, // royalty rate (5%)
        false, // not exclusive
        "commercial", // license type
        "Standard commercial license for digital reproduction",
    )
    
    // Non-licensor tries to terminate
    mockTxSender = "ST3YFNDD1VY183JJGR09BKWJZMHZ0YPJAXN79YJB"
    const result = licensing.terminateLicense(1)
    
    expect(result).toHaveProperty("error")
    expect(result.error).toBe(100) // ERR-NOT-AUTHORIZED
    
    // License should remain active
    const license = licensing.getLicense(1)
    expect(license.active).toBe(true)
  })
  
  it("should transfer a license to a new licensee", () => {
    // First create a license
    licensing.createLicense(
        1, // IP ID
        mockTxSender, // licensee is the same as sender for this test
        1000, // duration
        500, // royalty rate (5%)
        false, // not exclusive
        "commercial", // license type
        "Standard commercial license for digital reproduction",
    )
    
    // Then transfer it
    const newLicensee = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const result = licensing.transferLicense(1, newLicensee)
    
    expect(result).toHaveProperty("value")
    expect(result.value).toBe(true)
    
    const license = licensing.getLicense(1)
    expect(license.licensee).toBe(newLicensee)
  })
  
  it("should correctly determine if a license is active", () => {
    // Create an active license
    licensing.createLicense(
        1, // IP ID
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", // licensee
        1000, // duration
        500, // royalty rate (5%)
        false, // not exclusive
        "commercial", // license type
        "Standard commercial license for digital reproduction",
    )
    
    expect(licensing.isLicenseActive(1)).toBe(true)
    
    // Terminate the license
    licensing.terminateLicense(1)
    expect(licensing.isLicenseActive(1)).toBe(false)
  })
})

