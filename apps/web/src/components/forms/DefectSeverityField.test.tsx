import{describe,it,expect}from"vitest";
import{validateSeverity,SEVERITY_CONFIG}from"./DefectSeverityField";

describe("BD-018 DefectSeverity",()=>{
    it("maps normal/advisory/critical",()=>{
        expect(validateSeverity("normal")).toBe("normal");
        expect(validateSeverity("advisory")).toBe("advisory");
        expect(validateSeverity("critical")).toBe("critical");
    });
    it('fails safe on unknown - never defaults to normal',()=>{
        expect(validateSeverity("banana")).toBe("unknown");
        expect(validateSeverity("")).toBe("unknown");
        expect(validateSeverity(null)).toBe("unknown");
        expect(SEVERITY_CONFIG.unknown.label).toBe("Unknown");  
    });
});
