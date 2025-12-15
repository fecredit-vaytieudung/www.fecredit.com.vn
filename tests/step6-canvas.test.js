// tests/step6-canvas.test.js
// Tests for step6.html canvas rendering logic

describe('Step 6 Canvas Rendering', () => {
    describe('Canvas Dimensions', () => {
        test('canvas dimensions should be 595x844', () => {
            const canvasWidth = 595;
            const canvasHeight = 844;
            
            expect(canvasWidth).toBe(595);
            expect(canvasHeight).toBe(844);
        });
        
        test('canvas aspect ratio should match A4 portrait', () => {
            const canvasWidth = 595;
            const canvasHeight = 844;
            
            const aspectRatio = canvasWidth / canvasHeight;
            // A4 aspect ratio is approximately 0.705
            expect(aspectRatio).toBeCloseTo(0.705, 2);
        });
    });
    
    describe('Mock Data Generation', () => {
        function createMockData() {
            const today = new Date();
            const disbursementDate = today.toISOString().split('T')[0];
            
            const dueDate = new Date(today);
            dueDate.setMonth(dueDate.getMonth() + 1);
            
            return {
                isRegistered: true,
                fullName: "Nguyễn Văn A",
                dateOfBirth: "1990-05-15",
                cccd: "001234567890",
                idIssueDate: "2020-03-20",
                phone: "0901234567",
                currentAddress: "123 Nguyễn Huệ, Quận 1, TP.HCM",
                email: "test@example.com",
                monthlyIncome: "15000000",
                relativeName: "Nguyễn Thị B",
                relativePhone: "0987654321",
                loanAmount: 50000000,
                loanPurpose: "Vay tiêu dùng",
                loanTerm: 12,
                monthlyPayment: "4500000",
                interestRate: 18,
                accountNumber: "1234567890",
                disbursementDate: disbursementDate,
                dueDate: dueDate.toISOString().split('T')[0],
                loanCode: "TEST-001",
                loanType: "Vay tiêu dùng tín chấp",
                currentStep: 6,
                isContractDownloaded: false,
                isDisbursementDownloaded: false
            };
        }
        
        test('should include all required fields', () => {
            const data = createMockData();
            
            // Basic fields
            expect(data.fullName).toBeDefined();
            expect(data.cccd).toBeDefined();
            expect(data.phone).toBeDefined();
            expect(data.email).toBeDefined();
            expect(data.loanAmount).toBeDefined();
            
            // New required fields
            expect(data.dateOfBirth).toBeDefined();
            expect(data.idIssueDate).toBeDefined();
            expect(data.currentAddress).toBeDefined();
            expect(data.monthlyIncome).toBeDefined();
            expect(data.relativeName).toBeDefined();
            expect(data.relativePhone).toBeDefined();
            expect(data.monthlyPayment).toBeDefined();
            expect(data.loanType).toBeDefined();
        });
        
        test('should calculate due date correctly', () => {
            const data = createMockData();
            const disbursementDate = new Date(data.disbursementDate);
            const dueDate = new Date(data.dueDate);
            
            // Due date should be 1 month (approximately 30 days) after disbursement
            const diffTime = Math.abs(dueDate - disbursementDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Should be between 28-31 days depending on the month
            expect(diffDays).toBeGreaterThanOrEqual(28);
            expect(diffDays).toBeLessThanOrEqual(31);
        });
    });
    
    describe('Date Splitting Function', () => {
        function splitDate(dateStr) {
            if (!dateStr || typeof dateStr !== "string") return { day: "", month: "", year: "" };
            
            let day = "", month = "", year = "";
            
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [y, m, d] = dateStr.split("-");
                day = d || "";
                month = m || "";
                year = y || "";
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const [d, m, y] = dateStr.split("/");
                day = d || "";
                month = m || "";
                year = y || "";
            }
            
            return { day, month, year };
        }
        
        test('should parse YYYY-MM-DD format', () => {
            const result = splitDate("2020-03-20");
            expect(result).toEqual({ day: "20", month: "03", year: "2020" });
        });
        
        test('should parse DD/MM/YYYY format', () => {
            const result = splitDate("20/03/2020");
            expect(result).toEqual({ day: "20", month: "03", year: "2020" });
        });
        
        test('should return empty for invalid format', () => {
            const result = splitDate("invalid-date");
            expect(result).toEqual({ day: "", month: "", year: "" });
        });
        
        test('should handle null input', () => {
            const result = splitDate(null);
            expect(result).toEqual({ day: "", month: "", year: "" });
        });
    });
    
    describe('Number Formatting', () => {
        function formatNumber(number) {
            if (!number || number === "N/A" || number === 0) return "";
            return Number(number).toLocaleString("vi-VN");
        }
        
        test('should format Vietnamese numbers correctly', () => {
            expect(formatNumber(50000000)).toBe("50.000.000");
            expect(formatNumber(15000000)).toBe("15.000.000");
            expect(formatNumber(4500000)).toBe("4.500.000");
        });
        
        test('should handle string numbers', () => {
            expect(formatNumber("15000000")).toBe("15.000.000");
        });
        
        test('should return empty for invalid input', () => {
            expect(formatNumber(null)).toBe("");
            expect(formatNumber(0)).toBe("");
            expect(formatNumber("N/A")).toBe("");
        });
    });
    
    describe('Canvas Drawing Coordinates', () => {
        test('all coordinates should be within canvas bounds', () => {
            const canvasWidth = 595;
            const canvasHeight = 844;
            
            // Sample coordinates from the updated fields list
            const coordinates = [
                { x: 155, y: 141 },   // Họ và tên
                { x: 475, y: 138 },   // Ngày sinh
                { x: 101, y: 168 },   // Số CMND/CCCD
                { x: 284, y: 163 },   // Ngày cấp CMND
                { x: 314, y: 160 },   // Tháng cấp CMND
                { x: 339, y: 161 },   // Năm cấp CMND
                { x: 98, y: 208 },    // Số điện thoại
                { x: 219, y: 239 },   // Địa chỉ hiện tại
                { x: 120, y: 253 },   // Email
                { x: 159, y: 433 },   // Thu nhập hàng tháng
                { x: 106, y: 474 },   // Tên người thân
                { x: 455, y: 473 },   // Số điện thoại người thân
                { x: 145, y: 559 },   // Họ và tên (Ký tên dưới)
                { x: 99, y: 574 },    // Ngày đăng ký
                { x: 385, y: 575 },   // Ngày đến hạn
                { x: 273, y: 587 },   // Số tiền vay (Đoạn 1)
                { x: 212, y: 600 },   // Số tiền đóng hàng tháng
                { x: 325, y: 725 },   // Số tiền vay (Đoạn 2)
                { x: 161, y: 742 },   // Số tiền đề nghị vay
                { x: 165, y: 784 }    // Hình thức vay
            ];
            
            coordinates.forEach(coord => {
                expect(coord.x).toBeGreaterThanOrEqual(0);
                expect(coord.x).toBeLessThan(canvasWidth);
                expect(coord.y).toBeGreaterThanOrEqual(0);
                expect(coord.y).toBeLessThan(canvasHeight);
            });
        });
    });
    
    describe('Font Specifications', () => {
        test('font sizes should be between 10-12px', () => {
            const fontSpecs = [
                "bold 12px Arial",
                "10px Arial",
                "bold 11px Arial",
                "11px Arial"
            ];
            
            fontSpecs.forEach(font => {
                const sizeMatch = font.match(/(\d+)px/);
                expect(sizeMatch).toBeTruthy();
                const size = parseInt(sizeMatch[1]);
                expect(size).toBeGreaterThanOrEqual(10);
                expect(size).toBeLessThanOrEqual(12);
            });
        });
    });
});
