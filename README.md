# Image Clicker Admin Module

This Next.js application provides an admin interface for managing loads and viewing associated media files.

## Features

1. **Admin Authentication**: Simple login with hardcoded credentials
2. **Load Management**: View, add, and select loads
3. **S3 Media Integration**: Fetch images and videos directly from S3 buckets
4. **Media Viewer**: Display S3-hosted media with step organization
5. **Responsive UI**: Modern, mobile-friendly interface
6. **External API Access**: Open APIs for external applications

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Install MySQL/MariaDB
2. Create database using the provided script:

```bash
mysql -u root -p < db-script.sql
```

### 3. Environment Configuration

Create `.env.local` and configure your database and AWS credentials:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=image_clicker_admin
DB_PORT=3306

# AWS S3 Configuration
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000/admin/login`

## Admin Credentials

- **Username**: `admin`
- **Password**: `secure123`

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── login/page.tsx           # Admin login page
│   │   ├── dashboard/page.tsx       # Admin dashboard
│   │   └── load/[id]/page.tsx      # Load detail page
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts       # Login API
│       │   └── logout/route.ts      # Logout API
│       ├── loads/route.ts           # Loads management API
│       ├── media/route.ts           # Media retrieval API
│       └── users/route.ts           # Users API
├── components/
│   ├── LoadList.tsx                 # Load listing component
│   ├── MediaViewer.tsx              # Media display component
│   └── AddLoadForm.tsx              # New load form
└── lib/
    ├── db.ts                        # Database connection
    └── auth.ts                      # Authentication utilities
```

## Database Schema

### Users Table
- ID (Primary Key)
- name
- phoneNumber
- created_at

### Loads Table
- ID (Primary Key)
- userId (Foreign Key)
- loadNumber
- status (boolean: true/false)
- created_at

## S3 Media Structure

Media files are stored in S3 with the following structure:
```
loads/LOAD001/
├── timestamp-step1-photo.jpg
├── timestamp-step2-photo.jpg
└── timestamp-step3-video.mp4
```

File naming convention: `{timestamp}-step{number}-{type}.{extension}`

## API Endpoints

### Authentication (Admin Only)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout

### Data Management (No Auth Required)
- `GET /api/loads` - Fetch all loads
- `POST /api/loads` - Create new load
- `PATCH /api/loads/[id]` - Update load status
- `GET /api/users` - Fetch all users
- `POST /api/user/signup` - Register/login user

### Media (No Auth Required - Direct S3 Access)
- `GET /api/media?loadNumber=LOAD001` - Fetch media by load number
- `GET /api/loads/[loadNumber]/media` - Dedicated endpoint for external apps

### API Usage Examples

**Fetch load media for external apps:**
```bash
GET /api/loads/LOAD001/media
```

**Response:**
```json
{
  "success": true,
  "loadNumber": "LOAD001",
  "media": [
    {
      "id": "loads/LOAD001/2024-01-15-step1-photo.jpg",
      "type": "image",
      "step": 1,
      "timestamp": "2024-01-15T10:30:00Z",
      "fileName": "2024-01-15-step1-photo.jpg",
      "size": 1024000,
      "loadNumber": "LOAD001",
      "signedUrl": "https://bucket.s3.amazonaws.com/...",
      "s3Key": "loads/LOAD001/2024-01-15-step1-photo.jpg",
      "uri": "https://bucket.s3.amazonaws.com/..."
    }
  ],
  "count": 1
}
```

**Update load status:**
```bash
PATCH /api/loads/1
Content-Type: application/json

{
  "status": true
}
```

## Security Features

- Server-side authentication with HTTP-only cookies
- Protected routes with middleware
- Input validation on API endpoints
- Error handling and proper status codes

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **MySQL2** - Database driver
- **React Hooks** - State management

## Development

To modify admin credentials, update the hardcoded values in `lib/auth.ts`:

```typescript
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'secure123'
};
```

## Production Deployment

1. Update environment variables for production
2. Set `NODE_ENV=production`
3. Configure secure database connection
4. Consider using a proper authentication system
5. Set up proper SSL certificates

## Sample Data

The database script includes sample data:
- 2 users (John Doe, Jane Smith)
- 3 loads (LOAD001, LOAD002, LOAD003) with status flags

Media files are fetched directly from S3 based on load numbers.

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check database credentials in `.env.local`
   - Ensure MySQL server is running
   - Verify database exists

2. **Authentication Issues**
   - Clear browser cookies
   - Check console for API errors
   - Verify middleware configuration

3. **Media Loading Issues**
   - Check S3 URLs are accessible
   - Verify CORS configuration
   - Check browser console for errors

### Support

For issues or questions, check the application logs and ensure all dependencies are properly installed.
