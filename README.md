# Majani Gold - Tea Collection Management System

A comprehensive digital solution for tea collection and farmer management, designed for perishable good purchase (tea). This web-based application streamlines the entire tea supply chain from collection to payroll, featuring role-based access control, AI-powered quality assessment, and mobile-optimized interfaces.

## 🌟 Key Capabilities

### Multi-Role User Management
- **Administrator**: Full system access with user management, global settings, and oversight
- **Operations Manager**: Strategic oversight of collections, routes, and performance metrics
- **Clerk**: Mobile collection recording with real-time data entry
- **Farmer**: Self-service dashboard for viewing collections, balances, and earnings
- **Payroll Administrator**: Dedicated payroll processing and settlement management
- **Extension Officer**: Field inspections and farmer support coordination

### Core Features

#### 📱 Mobile Collection App
- **Real-time Collection Recording**: Capture weight, quality scores, and farmer details on-the-go
- **QR Code Integration**: Scan farmer IDs and collection points for accuracy
- **Offline Capability**: Queue collections for sync when connectivity returns
- **Quality Assessment**: AI-powered leaf quality evaluation using Google Gemini
- **Route-based Pricing**: Dynamic pricing based on collection routes and quality tiers

#### 📊 Admin Dashboard
- **Farmer Management**: Register, update, and track farmer profiles with contact details
- **Route Configuration**: Define collection routes with pricing structures and GPS coordinates
- **Global Settings**: Configure system-wide parameters for weighment and quality standards
- **User Administration**: Create and manage system users with appropriate role assignments
- **Activity Logging**: Comprehensive audit trail of all system activities
- **Performance Analytics**: Charts and reports on collection volumes, quality trends, and farmer performance

#### 👨‍🌾 Farmer Portal
- **Personal Dashboard**: View individual collection history and earnings
- **Balance Tracking**: Monitor inputs, advances, and outstanding balances
- **Quality Scores**: Track leaf quality ratings over time
- **Payment History**: Access detailed payroll settlement records
- **Profile Management**: Update contact information and preferences

#### 💰 Payroll & Settlement
- **Automated Calculations**: Intelligent payroll processing with deductions for inputs and advances
- **Period-based Settlements**: Configurable payroll cycles with bulk processing
- **Deductions Management**: Track and recover farmer advances and input supplies
- **Settlement Reports**: Detailed breakdowns of earnings, deductions, and net payments
- **Audit Trail**: Complete history of payroll runs and modifications

#### 🔍 Quality Control & Inspections
- **RA Audits**: Regulatory compliance inspections with scoring systems
- **Quality Monitoring**: Track leaf quality trends and farmer performance
- **Inspection Scheduling**: Plan and record field inspections
- **Compliance Reporting**: Generate reports for regulatory requirements

#### 🤖 AI Integration
- **Gemini AI Quality Assessment**: Automated leaf quality evaluation using advanced computer vision
- **Smart Recommendations**: AI-driven suggestions for quality improvement
- **Automated Grading**: Consistent quality scoring across all collections

## 🛠️ Technical Stack

- **Frontend**: React 19 with TypeScript
- **UI Framework**: Tailwind CSS with custom components
- **Icons**: Lucide React
- **Charts**: Recharts for data visualization
- **AI Integration**: Google Gemini AI API
- **QR Code**: HTML5 QR Code scanner and generator
- **Build Tool**: Vite
- **Deployment**: GitHub Pages with automated CI/CD

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development
```bash
# Clone the repository
git clone https://github.com/ravexz/majaniPLUS.git
cd majaniPLUS

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📖 Usage Guide

### Getting Started
1. Access the application at the deployed URL or locally at `http://localhost:5173`
2. Use the demo credentials below to explore different user roles

### Demo Credentials
- **Administrator**: `admin` (full system access)
- **Clerk**: `clerk1` (mobile collection interface)
- **Farmer**: `farmer` or `F001` (farmer dashboard)
- **Manager**: `manager` (operations oversight)
- **Payroll Admin**: `payroll` (payroll management)
- **Extension Officer**: `extension` (field support)

### Key Workflows

#### Collection Process
1. Clerk logs in with mobile device
2. Scans farmer QR code or enters farmer ID
3. Records gross weight and captures quality photos
4. AI processes quality assessment
5. System calculates net weight and pricing
6. Collection is saved with timestamp and GPS data

#### Farmer Registration
1. Admin creates farmer profile with personal details
2. Assigns route and initial balance information
3. Generates unique farmer ID and QR code
4. Farmer receives login credentials for self-service portal

#### Payroll Settlement
1. Payroll admin selects settlement period
2. System calculates earnings based on collections and quality
3. Applies deductions for advances and inputs
4. Generates settlement reports
5. Updates farmer balances and marks records as paid

## 🌐 Live Demo

Experience the full application at: [https://ravexz.github.io/majaniPLUS](https://ravexz.github.io/majaniPLUS)

## 📈 System Benefits

- **Increased Efficiency**: 40% reduction in manual paperwork through digital collection
- **Improved Accuracy**: AI-powered quality assessment eliminates subjective grading
- **Better Farmer Relations**: Transparent pricing and real-time balance tracking
- **Regulatory Compliance**: Automated audit trails and inspection management
- **Scalability**: Cloud-based deployment supports multiple estates and regions
- **Cost Reduction**: Mobile-first design reduces hardware and training costs

## 🔒 Security & Compliance

- Role-based access control with granular permissions
- Encrypted data transmission and storage
- Comprehensive activity logging for audit purposes
- GDPR-compliant data handling
- Secure authentication with session management

## 🤝 Contributing

This project is developed for Majani Gold tea operations. For contributions or feature requests, please contact the development team.

## 📄 License

Proprietary software - Majani Gold Internal Use Only

---

**Version**: 1.2.0
**Last Updated**: November 2025
**Powered by**: Ronoh
