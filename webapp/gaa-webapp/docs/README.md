# GAA Webapp Documentation

## 📂 Structure

### `/architecture/` - Current System Reference
Core architecture and data contract documentation for the live system.

### `/lambda/` - Lambda System Documentation  
Lambda function flows, status reports, and integration docs.

### `/archive/` - Completed Implementation Docs
Historical implementation plans, completed features, and old setup guides.

---

## 🎯 Quick Links

**Current System:**
- [System Architecture](architecture/GAA_WEBAPP_ARCHITECTURE.md)
- [Data Contract](architecture/DATA_CONTRACT.md) ⭐ **Important**
- [Testing Guide](architecture/TESTING_GUIDE.md)

**Lambda:**
- [Lambda Status Report](lambda/LAMBDA_STATUS_REPORT.md)
- [XML Analysis Flow](lambda/GAA_XML_ANALYSIS_FLOW.md)

**Infrastructure:**
- [AWS Infrastructure Setup](architecture/AWS_INFRASTRUCTURE_SETUP.md)
- [Pages Diagram](architecture/PAGES_DIAGRAM.md)

---

## 📋 Current State (Nov 2025)

**Status:** ✅ Website functionally complete, AI needs improvement

**What Works:**
- Frontend/Backend deployed on Vercel
- Lambda video processing (download + AI analysis)
- Video player with events and timeline
- Team management and auth

**What Needs Work:**
- AI event quality (accuracy, descriptions)
- Team colors metadata (Lambda fix needed)
- Event timestamp verification

