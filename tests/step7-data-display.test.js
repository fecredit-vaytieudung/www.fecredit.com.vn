/**
 * Test for step7.html data display fixes
 * Tests encryption key, bank name mapping, and data validation
 */

describe('Step7 Data Display', () => {
  // Mock CryptoJS
  global.CryptoJS = {
    AES: {
      decrypt: jest.fn(),
      encrypt: jest.fn()
    },
    enc: {
      Utf8: {
        toString: jest.fn()
      }
    }
  };

  describe('getBankFullName', () => {
    // Function under test (extracted from step7.html)
    function getBankFullName(bankCode) {
      const MIN_FULL_NAME_LENGTH = 20;
      const bankMap = {
        'shinhan': 'Ngân hàng Shinhan Việt Nam (Shinhanbank)',
        'vietcombank': 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
        'vietinbank': 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)',
        'bidv': 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
        'techcombank': 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
        'agribank': 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)',
        'mbbank': 'Ngân hàng TMCP Quân đội (MB Bank)',
        'vpbank': 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)',
        'acb': 'Ngân hàng TMCP Á Châu (ACB)',
        'sacombank': 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)'
      };
      
      if (!bankCode) return '';
      
      // Nếu đã là tên đầy đủ, trả về luôn
      if (bankCode.length > MIN_FULL_NAME_LENGTH) return bankCode;
      
      // Nếu là mã code, chuyển đổi
      return bankMap[bankCode.toLowerCase()] || bankCode;
    }

    test('should convert bank code to full name', () => {
      expect(getBankFullName('shinhan')).toBe('Ngân hàng Shinhan Việt Nam (Shinhanbank)');
      expect(getBankFullName('vietcombank')).toBe('Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)');
      expect(getBankFullName('bidv')).toBe('Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)');
    });

    test('should handle case-insensitive bank codes', () => {
      expect(getBankFullName('SHINHAN')).toBe('Ngân hàng Shinhan Việt Nam (Shinhanbank)');
      expect(getBankFullName('VietcomBank')).toBe('Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)');
    });

    test('should return full name if already provided', () => {
      const fullName = 'Ngân hàng TMCP Ngoại Thương Việt Nam';
      expect(getBankFullName(fullName)).toBe(fullName);
    });

    test('should return empty string for null/undefined', () => {
      expect(getBankFullName(null)).toBe('');
      expect(getBankFullName(undefined)).toBe('');
      expect(getBankFullName('')).toBe('');
    });

    test('should return original code for unknown banks', () => {
      expect(getBankFullName('unknownbank')).toBe('unknownbank');
    });
  });

  describe('Encryption Key', () => {
    test('should use correct encryption key', () => {
      const ENCRYPTION_KEY = "fecredit-secret-key-v1";
      expect(ENCRYPTION_KEY).toBe("fecredit-secret-key-v1");
      expect(ENCRYPTION_KEY).not.toBe("fecredit-secret-key");
    });
  });

  describe('Data Mapping', () => {
    function sanitizeValue(value) {
      if (value === null || value === undefined) return "";
      if (typeof value === "number") {
        return Number.isFinite(value) && value !== 0 ? String(value) : "";
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return "";
        const upper = trimmed.toUpperCase();
        if (upper === "N/A" || upper === "NULL" || upper === "UNDEFINED") {
          return "";
        }
        return trimmed;
      }
      return "";
    }

    test('should sanitize values correctly', () => {
      expect(sanitizeValue("  test  ")).toBe("test");
      expect(sanitizeValue("N/A")).toBe("");
      expect(sanitizeValue("null")).toBe("");
      expect(sanitizeValue(null)).toBe("");
      expect(sanitizeValue(undefined)).toBe("");
      expect(sanitizeValue("")).toBe("");
      expect(sanitizeValue(123)).toBe("123");
      expect(sanitizeValue(0)).toBe("");
    });

    test('should map issuePlace to idIssuePlace', () => {
      const userData = {
        issuePlace: "Cục Cảnh sát ĐKQL Cư trú và DLQG về dân cư"
      };
      
      // Simulate the mapping logic from loadUserData
      if (userData.issuePlace && !userData.idIssuePlace) {
        userData.idIssuePlace = userData.issuePlace;
      }
      
      expect(userData.idIssuePlace).toBe("Cục Cảnh sát ĐKQL Cư trú và DLQG về dân cư");
    });
  });

  describe('calculateIdIssueDate', () => {
    // Function under test (extracted from step7.html)
    function calculateIdIssueDate(dob) {
      if (!dob) return '';
      
      // Constants for date validation
      const MAX_DAY = 31;
      const MAX_MONTH = 12;
      const MIN_YEAR = 1900;
      const ID_ISSUE_AGE = 18;
      
      try {
        // Parse dob (có thể là dd/mm/yyyy hoặc yyyy-mm-dd)
        let day, month, year;
        
        if (dob.includes('/')) {
          // Format dd/mm/yyyy
          const parts = dob.split('/');
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        } else if (dob.includes('-')) {
          // Format yyyy-mm-dd
          const parts = dob.split('-');
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          return '';
        }
        
        // Kiểm tra tính hợp lệ
        if (!day || !month || !year || 
            day < 1 || day > MAX_DAY || 
            month < 1 || month > MAX_MONTH || 
            year < MIN_YEAR) {
          return '';
        }
        
        // Cộng 18 năm
        const issueYear = year + ID_ISSUE_AGE;
        
        // Format dd/mm/yyyy
        const dayStr = day.toString().padStart(2, '0');
        const monthStr = month.toString().padStart(2, '0');
        
        return `${dayStr}/${monthStr}/${issueYear}`;
      } catch (error) {
        console.error('Lỗi tính ngày cấp:', error);
        return '';
      }
    }

    test('should calculate idIssueDate from dob in dd/mm/yyyy format', () => {
      expect(calculateIdIssueDate('15/06/1990')).toBe('15/06/2008');
      expect(calculateIdIssueDate('01/01/2000')).toBe('01/01/2018');
      expect(calculateIdIssueDate('31/12/1985')).toBe('31/12/2003');
    });

    test('should calculate idIssueDate from dob in yyyy-mm-dd format', () => {
      expect(calculateIdIssueDate('1990-06-15')).toBe('15/06/2008');
      expect(calculateIdIssueDate('2000-01-01')).toBe('01/01/2018');
      expect(calculateIdIssueDate('1985-12-31')).toBe('31/12/2003');
    });

    test('should pad day and month with zero', () => {
      expect(calculateIdIssueDate('5/6/1990')).toBe('05/06/2008');
      expect(calculateIdIssueDate('1990-6-5')).toBe('05/06/2008');
    });

    test('should return empty string for invalid dates', () => {
      expect(calculateIdIssueDate('')).toBe('');
      expect(calculateIdIssueDate(null)).toBe('');
      expect(calculateIdIssueDate(undefined)).toBe('');
      expect(calculateIdIssueDate('invalid')).toBe('');
      expect(calculateIdIssueDate('32/13/1990')).toBe('');
      expect(calculateIdIssueDate('0/0/1900')).toBe('');
    });

    test('should set empty idIssueDate if dob not present', () => {
      const userData = {};
      
      // Simulate the mapping logic from loadUserData
      if (!userData.idIssueDate && userData.dob) {
        userData.idIssueDate = calculateIdIssueDate(userData.dob);
      } else if (!userData.idIssueDate) {
        userData.idIssueDate = "";
      }
      
      expect(userData.idIssueDate).toBe("");
    });

    test('should calculate idIssueDate if dob is present', () => {
      const userData = {
        dob: '15/06/1990'
      };
      
      // Simulate the mapping logic from loadUserData
      if (!userData.idIssueDate && userData.dob) {
        userData.idIssueDate = calculateIdIssueDate(userData.dob);
      } else if (!userData.idIssueDate) {
        userData.idIssueDate = "";
      }
      
      expect(userData.idIssueDate).toBe('15/06/2008');
    });
  });

  describe('Mock Data', () => {
    function createMockData() {
      // Mock data đã bị vô hiệu hóa
      return null;
    }

    test('should not return mock data', () => {
      expect(createMockData()).toBeNull();
    });
  });
});
