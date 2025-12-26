# AWS Infrastructure Setup Guide for DocTalk (Simplified)

This guide walks you through manually setting up AWS infrastructure for DocTalk's document processing pipeline. This version uses a **single VPC** and **skips NAT Gateway** to reduce costs and complexity.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Next.js App                                        │
│                                                                              │
│  1. Generate presigned URL ──────────────────────────────┐                  │
│  2. Frontend uploads to S3 ──────────────────────────────┼──► S3            │
│  3. S3 Event ──► SQS ──► Lambda (parse & chunk) ─────────┘       │          │
│  4. Lambda saves chunks to RDS ◄─────────────────────────────────┼──► RDS   │
│  5. Next.js generates embeddings (OpenAI) & saves to RDS ────────┘          │
│  6. Next.js handles chat (OpenAI + vector search)                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Network Architecture (Single VPC)

```
doctalk-vpc (10.0.0.0/16)
│
├── Public Subnets (with Internet Gateway route)
│   ├── doctalk-public-1 (10.0.10.0/24) - us-east-1a
│   ├── doctalk-public-2 (10.0.11.0/24) - us-east-1b
│   └── RDS PostgreSQL (publicly accessible for dev)
│
├── Private Subnets (no internet route)
│   ├── doctalk-private-1 (10.0.1.0/24) - us-east-1a
│   ├── doctalk-private-2 (10.0.2.0/24) - us-east-1b
│   └── Lambda Function
│
├── Internet Gateway (for public subnet internet access)
└── S3 Gateway Endpoint (Lambda → S3, free, no internet needed)
```

> **Note**: SQS VPC Endpoint is NOT needed. Lambda's SQS trigger is handled by AWS internally.

### Setup Options (Choose One)

| Option | RDS Location | Lambda Location | Lambda → RDS | Complexity |
|--------|--------------|-----------------|--------------|------------|
| **A) Lambda in Public Subnet** (simplest for dev) | Default VPC (public) | `doctalk-vpc` public subnet | Via public endpoint | **Simplest** |
| **B) VPC Peering** (more secure) | Default VPC | `doctalk-vpc` private subnet | Via VPC Peering | Moderate |
| **C) Single VPC** (cleanest, new RDS) | `doctalk-vpc` public subnet | `doctalk-vpc` private subnet | Same VPC, private IP | Simple |

**For existing RDS in Default VPC**, choose **Option A** (simplest) or **Option B** (more secure).

**Option A** is recommended for development because:
- No VPC Peering setup required
- Lambda connects to RDS via public endpoint (same as your local machine)
- Quick to set up

### Key Design: No NAT Gateway

| Component | Calls OpenAI? | Internet Needed? |
|-----------|---------------|------------------|
| Lambda | No (just parses docs) | No - uses VPC Endpoints |
| Next.js | Yes (embeddings + chat) | Yes - runs outside VPC |

**Lambda responsibilities:**
- Download file from S3 (via VPC Endpoint)
- Parse PDF/DOCX/TXT
- Split into chunks
- Save raw chunks to RDS (without embeddings)
- Update document status

**Next.js responsibilities:**
- Generate presigned URLs
- Poll for document status
- Generate embeddings for chunks (OpenAI)
- Handle chat with RAG (OpenAI)

---

## Prerequisites

- AWS Account with admin access
- AWS CLI installed and configured (`aws configure`)
- Your AWS Account ID (run `aws sts get-caller-identity`)

---

## Step 1: Create VPC and Network Infrastructure

We'll create a single VPC with both public subnets (for RDS) and private subnets (for Lambda).

### 1.1 Create the VPC

1. Go to **VPC Console** → **Your VPCs** → **Create VPC**
2. Settings:
   - **Resources to create**: VPC only
   - **Name tag**: `doctalk-vpc`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **IPv6 CIDR block**: No IPv6 CIDR block
   - **Tenancy**: Default
3. Click **Create VPC**
4. **Note down the VPC ID**: `vpc-xxxxxxxxx`

### 1.2 Create Internet Gateway

The Internet Gateway allows resources in public subnets to access the internet.

1. **VPC Console** → **Internet gateways** → **Create internet gateway**
2. Settings:
   - **Name tag**: `doctalk-igw`
3. Click **Create internet gateway**
4. Select the newly created IGW → **Actions** → **Attach to VPC**
5. Select `doctalk-vpc` → Click **Attach internet gateway**

### 1.3 Create Public Subnets (for RDS)

**Public Subnet 1:**
1. **VPC Console** → **Subnets** → **Create subnet**
2. Settings:
   - **VPC ID**: `doctalk-vpc`
   - **Subnet name**: `doctalk-public-1`
   - **Availability Zone**: Choose first AZ (e.g., `us-east-1a`)
   - **IPv4 CIDR block**: `10.0.10.0/24`
3. Click **Create subnet**

**Public Subnet 2:**
1. **Create subnet** again
2. Settings:
   - **VPC ID**: `doctalk-vpc`
   - **Subnet name**: `doctalk-public-2`
   - **Availability Zone**: Choose second AZ (e.g., `us-east-1b`)
   - **IPv4 CIDR block**: `10.0.11.0/24`
3. Click **Create subnet**

**Enable Auto-assign Public IP (both subnets):**
1. Select `doctalk-public-1` → **Actions** → **Edit subnet settings**
2. Check **Enable auto-assign public IPv4 address**
3. Click **Save**
4. Repeat for `doctalk-public-2`

### 1.4 Create Private Subnets (for Lambda)

**Private Subnet 1:**
1. **Create subnet**
2. Settings:
   - **VPC ID**: `doctalk-vpc`
   - **Subnet name**: `doctalk-private-1`
   - **Availability Zone**: Same as public-1 (e.g., `us-east-1a`)
   - **IPv4 CIDR block**: `10.0.1.0/24`
3. Click **Create subnet**

**Private Subnet 2:**
1. **Create subnet**
2. Settings:
   - **VPC ID**: `doctalk-vpc`
   - **Subnet name**: `doctalk-private-2`
   - **Availability Zone**: Same as public-2 (e.g., `us-east-1b`)
   - **IPv4 CIDR block**: `10.0.2.0/24`
3. Click **Create subnet**

**Note down all Subnet IDs** - you'll need them later.

### 1.5 Create Route Tables

**Public Route Table (for RDS subnets):**
1. **VPC Console** → **Route tables** → **Create route table**
2. Settings:
   - **Name**: `doctalk-public-rt`
   - **VPC**: `doctalk-vpc`
3. Click **Create route table**
4. Select the route table → **Routes** tab → **Edit routes** → **Add route**:
   - **Destination**: `0.0.0.0/0`
   - **Target**: Internet Gateway → `doctalk-igw`
5. Click **Save changes**
6. Go to **Subnet associations** tab → **Edit subnet associations**
7. Select both `doctalk-public-1` and `doctalk-public-2`
8. Click **Save associations**

**Private Route Table (for Lambda subnets):**
1. **Create route table**
2. Settings:
   - **Name**: `doctalk-private-rt`
   - **VPC**: `doctalk-vpc`
3. Click **Create route table**
4. Go to **Subnet associations** tab → **Edit subnet associations**
5. Select both `doctalk-private-1` and `doctalk-private-2`
6. Click **Save associations**

> **Note**: The private route table has NO route to the internet. Lambda will use VPC Endpoints instead.

### 1.6 Create Security Groups

**Security Group for RDS:**
1. **VPC Console** → **Security Groups** → **Create security group**
2. Settings:
   - **Security group name**: `doctalk-rds-sg`
   - **Description**: Security group for DocTalk RDS
   - **VPC**: `doctalk-vpc`
3. **Inbound rules** → **Add rule**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: My IP (adds your current public IP)
4. Click **Create security group**
5. **Note down Security Group ID**: `sg-xxxxxxxxx`

**Security Group for Lambda:**
1. **Create security group**
2. Settings:
   - **Security group name**: `doctalk-lambda-sg`
   - **Description**: Security group for DocTalk Lambda
   - **VPC**: `doctalk-vpc`
3. **Inbound rules**: None needed (Lambda only makes outbound connections)
4. **Outbound rules**: Keep default (all traffic allowed)
5. Click **Create security group**
6. **Note down Security Group ID**: `sg-yyyyyyyyy`

**Update RDS Security Group to Allow Lambda:**

*For Option B/C (Lambda in private subnets, same VPC or peered):*
1. Go to `doctalk-rds-sg` → **Inbound rules** → **Edit inbound rules**
2. **Add rule**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Custom → Enter `doctalk-lambda-sg` security group ID (or `10.0.0.0/16` for peering)
3. Click **Save rules**

*For Option A (Lambda in public subnets, RDS in Default VPC):*
- Lambda accesses RDS via the **public endpoint**
- Your existing RDS security group just needs to allow connections (it may already allow your IP)
- Since Lambda's public IP is dynamic, you can either:
  - Allow `0.0.0.0/0` on port 5432 (less secure, dev only)
  - Or use Option B with VPC Peering for proper security

### 1.7 Create VPC Endpoint for S3

This allows Lambda in private subnets to download files from S3 without internet access.

1. **VPC Console** → **Endpoints** → **Create endpoint**
2. Settings:
   - **Name tag**: `doctalk-s3-endpoint`
   - **Service category**: AWS services
   - **Services**: Search `s3` → Select `com.amazonaws.{region}.s3` (Type: Gateway)
   - **VPC**: `doctalk-vpc`
   - **Route tables**: Select `doctalk-private-rt`
   - **Policy**: Full access
3. Click **Create endpoint**

> **Note on SQS**: You do NOT need an SQS VPC Endpoint. When Lambda is triggered by SQS, AWS handles the connection internally through the Lambda service. The SQS trigger works regardless of Lambda's VPC configuration.

> **Cost Note**: S3 Gateway Endpoint is **free**.

---

## Step 2: Create RDS PostgreSQL

Now we'll create RDS in the public subnets for development access.

### 2.1 Create DB Subnet Group (Optional)

> **Already have RDS?** If your RDS is already running in the **Default VPC** with the default subnet group, you can skip this step for now. Your setup will use **VPC Peering** instead (see Step 2.4). You can migrate to the single-VPC setup later.

If creating a new RDS instance in `doctalk-vpc`:

1. Go to **RDS Console** → **Subnet groups** → **Create DB subnet group**
2. Settings:
   - **Name**: `doctalk-db-subnet-group`
   - **Description**: Subnet group for DocTalk RDS
   - **VPC**: `doctalk-vpc`
3. **Add subnets**:
   - **Availability Zones**: Select both AZs (e.g., `us-east-1a`, `us-east-1b`)
   - **Subnets**: Select `doctalk-public-1` and `doctalk-public-2` (the 10.0.10.x and 10.0.11.x subnets)
4. Click **Create**

> ⚠️ **Important**: Select the PUBLIC subnets (10.0.10.0/24, 10.0.11.0/24), not the private ones!

### 2.2 Create RDS Instance

1. Go to **RDS Console** → **Databases** → **Create database**
2. **Engine options**:
   - **Engine**: PostgreSQL
   - **Version**: PostgreSQL 16.x (or 15.x) - pgvector is included

3. **Templates**: Free tier (development) or Dev/Test

4. **Settings**:
   - **DB instance identifier**: `doctalk-db`
   - **Master username**: `postgres`
   - **Master password**: Create strong password → **SAVE THIS!**

5. **Instance configuration**:
   - **DB instance class**: `db.t3.micro` (free tier) or `db.t4g.micro`

6. **Storage**:
   - **Storage type**: gp2 (or gp3)
   - **Allocated storage**: 20 GB
   - **Enable storage autoscaling**: Yes, max 100 GB

7. **Connectivity**:
   - **Compute resource**: Don't connect to EC2
   - **Network type**: IPv4
   - **VPC**: `doctalk-vpc` ← Select your VPC!
   - **DB subnet group**: `doctalk-db-subnet-group`
   - **Public access**: **Yes** ✓
   - **VPC security group**: Choose existing → `doctalk-rds-sg`
   - **Availability Zone**: No preference

8. **Database authentication**: Password authentication

9. **Additional configuration**:
   - **Initial database name**: `doctalk`
   - Uncheck "Enable automated backups" (for dev to save costs, enable for prod)

10. Click **Create database** (takes 5-10 minutes)

11. Once available, note down:
    - **Endpoint**: `doctalk-db.xxxxx.us-east-1.rds.amazonaws.com`
    - **Port**: `5432`

> ⚠️ **Security Note**: For production, use private subnets and remove public access. For development, public access with IP whitelist is acceptable.

### 2.3 Initialize Database Schema

1. Connect to your RDS instance using any PostgreSQL client:

```bash
psql -h doctalk-db.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d doctalk
```

2. Run this SQL to set up pgvector and tables:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    page_count INT,
    chunk_count INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Document chunks with embeddings
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    chunk_index INT,
    page_number INT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chats
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chats_user ON chats(user_id);
CREATE INDEX idx_chats_document ON chats(document_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);

-- Vector similarity index (create after you have some data, or now with small lists value)
-- Using HNSW for better performance (available in pgvector 0.5+)
CREATE INDEX idx_chunks_embedding ON document_chunks
USING hnsw (embedding vector_cosine_ops);
```

3. Verify pgvector is working:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 2.4 VPC Peering (Option B Only)

> **Skip this section if:**
> - You're using **Option A** (Lambda in public subnets) - Lambda accesses RDS via public endpoint
> - You're using **Option C** (Single VPC) - Lambda and RDS are in the same VPC

**Only needed for Option B**: If your RDS is in the **Default VPC** and you want Lambda in **private subnets** (more secure), you need VPC Peering.

#### 2.4.1 Get Default VPC Info

1. Go to **VPC Console** → **Your VPCs**
2. Find the **Default VPC** (marked as "Yes" in Default column)
3. Note down:
   - **VPC ID**: `vpc-xxxxxxxx`
   - **IPv4 CIDR**: Usually `172.31.0.0/16`

#### 2.4.2 Create Peering Connection

1. **VPC Console** → **Peering connections** → **Create peering connection**
2. Settings:
   - **Name**: `doctalk-vpc-peering`
   - **VPC ID (Requester)**: `doctalk-vpc`
   - **VPC ID (Accepter)**: Select **My account**, **This Region**
   - **VPC ID (Accepter)**: Default VPC ID
3. Click **Create peering connection**
4. Select the new connection → **Actions** → **Accept request** → **Accept**

#### 2.4.3 Update Route Tables

**Add route in `doctalk-private-rt` (Lambda → RDS):**
1. Go to **Route tables** → Select `doctalk-private-rt`
2. **Routes** tab → **Edit routes** → **Add route**:
   - **Destination**: `172.31.0.0/16` (Default VPC CIDR)
   - **Target**: Peering Connection → `doctalk-vpc-peering`
3. Click **Save changes**

**Add route in Default VPC route table (RDS → Lambda responses):**
1. Go to **Route tables** → Find the route table associated with Default VPC
2. **Routes** tab → **Edit routes** → **Add route**:
   - **Destination**: `10.0.0.0/16` (doctalk-vpc CIDR)
   - **Target**: Peering Connection → `doctalk-vpc-peering`
3. Click **Save changes**

#### 2.4.4 Update RDS Security Group

1. Go to **EC2 Console** → **Security Groups**
2. Find the security group attached to your RDS (e.g., `doctalk-rds-sg` or default)
3. **Inbound rules** → **Edit inbound rules** → **Add rule**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Custom → `10.0.1.0/24` (or `10.0.0.0/16` for entire doctalk-vpc)
4. Click **Save rules**

> **Note**: With VPC Peering, Lambda connects to RDS via **private IP** across VPCs. This is slightly more complex than the single-VPC approach but works fine.

---

## Step 3: Create S3 Bucket

### 3.1 Create Bucket

1. Go to **S3 Console** → **Create bucket**
2. Settings:
   - **Bucket name**: `doctalk-documents-{your-account-id}` (must be globally unique)
   - **Region**: Same region as RDS (e.g., `us-east-1`)
   - **Object Ownership**: ACLs disabled
   - **Block Public Access**: Keep ALL checked (blocked)
   - **Bucket Versioning**: Disable
   - **Encryption**: SSE-S3 (default)
3. Click **Create bucket**

### 3.2 Configure CORS

1. Select your bucket → **Permissions** tab → **CORS** → **Edit**
2. Paste this configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://yourdomain.com"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

3. Click **Save changes**

---

## Step 4: Create SQS Queue

### 4.1 Create Main Queue

1. Go to **SQS Console** → **Create queue**
2. Settings:
   - **Type**: Standard
   - **Name**: `doctalk-document-processing`

3. **Configuration**:
   - **Visibility timeout**: `900` seconds (15 minutes)
   - **Message retention period**: 4 days
   - **Delivery delay**: 0 seconds
   - **Maximum message size**: 256 KB
   - **Receive message wait time**: 20 seconds

4. Click **Create queue**

5. Note down:
   - **Queue URL**: `https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/doctalk-document-processing`
   - **Queue ARN**: `arn:aws:sqs:us-east-1:ACCOUNT_ID:doctalk-document-processing`

### 4.2 Create Dead Letter Queue

1. **Create queue** again
2. Settings:
   - **Type**: Standard
   - **Name**: `doctalk-processing-dlq`
3. Click **Create queue**

### 4.3 Configure DLQ on Main Queue

1. Go back to `doctalk-document-processing` queue
2. Click **Edit**
3. Scroll to **Dead-letter queue** section:
   - **Enable**: Yes
   - **Choose queue**: `doctalk-processing-dlq`
   - **Maximum receives**: `3`
4. Click **Save**

---

## Step 5: Configure S3 → SQS Event Notification

### 5.1 Update SQS Access Policy

1. Go to `doctalk-document-processing` queue → **Access policy** tab → **Edit**
2. Replace with this policy (update YOUR_ACCOUNT_ID):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ToSendMessage",
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "SQS:SendMessage",
      "Resource": "arn:aws:sqs:us-east-1:YOUR_ACCOUNT_ID:doctalk-document-processing",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::doctalk-documents-YOUR_ACCOUNT_ID"
        }
      }
    }
  ]
}
```

3. Click **Save**

### 5.2 Create S3 Event Notification

1. Go to your S3 bucket → **Properties** tab
2. Scroll to **Event notifications** → **Create event notification**
3. Settings:
   - **Event name**: `document-upload`
   - **Prefix**: `uploads/` (only trigger for files in uploads folder)
   - **Event types**: Select **All object create events**
   - **Destination**: SQS queue
   - **Specify SQS queue**: Choose from your SQS queues → `doctalk-document-processing`
4. Click **Save changes**

---

## Step 6: Create IAM Role for Lambda

### 6.1 Create the Role

1. Go to **IAM Console** → **Roles** → **Create role**
2. Settings:
   - **Trusted entity type**: AWS service
   - **Use case**: Lambda
3. Click **Next**

4. **Add permissions** - search and add:
   - `AWSLambdaBasicExecutionRole`
   - `AWSLambdaVPCAccessExecutionRole`

5. Click **Next**
6. **Role name**: `doctalk-lambda-role`
7. Click **Create role**

### 6.2 Add Inline Policy

1. Select `doctalk-lambda-role` → **Add permissions** → **Create inline policy**
2. Click **JSON** and paste (update YOUR_ACCOUNT_ID and REGION):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3ReadAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:HeadObject"
            ],
            "Resource": "arn:aws:s3:::doctalk-documents-YOUR_ACCOUNT_ID/*"
        },
        {
            "Sid": "SQSAccess",
            "Effect": "Allow",
            "Action": [
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueAttributes"
            ],
            "Resource": "arn:aws:sqs:REGION:YOUR_ACCOUNT_ID:doctalk-document-processing"
        }
    ]
}
```

3. **Policy name**: `doctalk-lambda-policy`
4. Click **Create policy**

---

## Step 7: Create Lambda Function

### 7.1 Create Function

1. Go to **Lambda Console** → **Create function**
2. Select **Author from scratch**
3. Settings:
   - **Function name**: `doctalk-document-processor`
   - **Runtime**: Python 3.11
   - **Architecture**: x86_64
   - **Execution role**: Use existing role → `doctalk-lambda-role`
4. Click **Create function**

### 7.2 Configure Function

**General configuration:**
1. Go to **Configuration** → **General configuration** → **Edit**
   - **Memory**: `1024` MB
   - **Timeout**: `10` min 0 sec
   - **Ephemeral storage**: `512` MB
2. Click **Save**

**VPC configuration:**
1. Go to **Configuration** → **VPC** → **Edit**
   - **VPC**: `doctalk-vpc`
   - **Subnets**: Choose based on your setup option:
     - **Option A (simplest)**: Select `doctalk-public-1` and `doctalk-public-2`
     - **Option B/C (private)**: Select `doctalk-private-1` and `doctalk-private-2`
   - **Security groups**: `doctalk-lambda-sg`
2. Click **Save**

> **Option A Note**: When Lambda is in public subnets with an Internet Gateway route, it can access the internet (including your public RDS endpoint) directly. No VPC Peering needed.

**Environment variables:**
1. Go to **Configuration** → **Environment variables** → **Edit**
2. Add these variables:

| Key | Value |
|-----|-------|
| `DB_HOST` | `doctalk-db.xxxxx.us-east-1.rds.amazonaws.com` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `doctalk` |
| `DB_USER` | `
` |
| `DB_PASSWORD` | `your-password` |
| `S3_BUCKET` | `doctalk-documents-YOUR_ACCOUNT_ID` |

3. Click **Save**

### 7.3 Add SQS Trigger

1. Go to **Function overview** → **Add trigger**
2. Settings:
   - **Source**: SQS
   - **SQS queue**: `doctalk-document-processing`
   - **Batch size**: `1`
   - **Batch window**: `0`
3. Click **Add**

---

## Step 8: IAM User for Next.js

Create an IAM user for your Next.js app to access AWS services.

### 8.1 Create IAM User

1. **IAM Console** → **Users** → **Create user**
2. **User name**: `doctalk-nextjs-app`
3. Click **Next**
4. **Set permissions** → **Attach policies directly**
5. Click **Create policy** (opens new tab):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3PresignedURLs",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::doctalk-documents-YOUR_ACCOUNT_ID/uploads/*"
        }
    ]
}
```

6. **Policy name**: `doctalk-nextjs-policy`
7. Go back, refresh, and attach `doctalk-nextjs-policy`
8. Click **Create user**

### 8.2 Create Access Keys

1. Select the user → **Security credentials** tab
2. **Access keys** → **Create access key**
3. Select **Application running outside AWS**
4. Click **Create access key**
5. **Download .csv file** or copy the keys

---

## Summary: Resources Created

| Resource | Name | Purpose |
|----------|------|---------|
| **Networking** | | |
| VPC | `doctalk-vpc` | VPC for Lambda (and optionally RDS) |
| Internet Gateway | `doctalk-igw` | Internet access for public subnets |
| Public Subnets | `doctalk-public-1`, `doctalk-public-2` | RDS placement (if using single VPC) |
| Private Subnets | `doctalk-private-1`, `doctalk-private-2` | Lambda placement (no internet) |
| Public Route Table | `doctalk-public-rt` | Routes to Internet Gateway |
| Private Route Table | `doctalk-private-rt` | No internet route + peering route |
| S3 VPC Endpoint | `doctalk-s3-endpoint` | Lambda → S3 (free, no internet needed) |
| VPC Peering | `doctalk-vpc-peering` | Lambda → RDS (only if RDS in Default VPC) |
| **Security** | | |
| RDS Security Group | `doctalk-rds-sg` | Allow your IP + Lambda |
| Lambda Security Group | `doctalk-lambda-sg` | Lambda outbound access |
| **Database** | | |
| DB Subnet Group | `doctalk-db-subnet-group` | RDS subnet config (only if single VPC) |
| RDS PostgreSQL | `doctalk-db` | Database with pgvector |
| **Storage & Queues** | | |
| S3 Bucket | `doctalk-documents-xxx` | Document storage |
| SQS Queue | `doctalk-document-processing` | Job queue |
| SQS DLQ | `doctalk-processing-dlq` | Failed jobs |
| **Compute & IAM** | | |
| IAM Role | `doctalk-lambda-role` | Lambda permissions |
| IAM User | `doctalk-nextjs-app` | Next.js app permissions |
| Lambda | `doctalk-document-processor` | Document processing |

---

## Environment Variables for Next.js

Add these to your `.env.local`:

```env
# AWS Credentials (from IAM user)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# S3
S3_BUCKET_NAME=doctalk-documents-YOUR_ACCOUNT_ID

# Database
DATABASE_URL=postgresql://postgres:*>M(tqtVSEWCIOhqv>1cE0G|()8l@doctalk-db.c6dmw60g4elb.us-east-1.rds.amazonaws.com:5432/doctalk

# OpenAI (for embeddings and chat)
OPENAI_API_KEY=sk-...

# Existing Cognito config
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=...
NEXT_PUBLIC_COGNITO_CLIENT_ID=...
```

---

## Cost Estimate (Development)

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| RDS db.t3.micro | 12 months | ~$13/month |
| S3 | 5 GB | $0.023/GB |
| SQS | 1M requests | Free for low usage |
| Lambda | 1M requests, 400K GB-sec | Free for low usage |
| S3 VPC Endpoint | **Free** (Gateway type) | **Free** |
| NAT Gateway | ~~$32/month~~ | **Skipped!** |
| SQS VPC Endpoint | ~~$7/month~~ | **Not needed!** |

**Total dev cost: ~$13/month** (vs ~$52 with NAT + SQS endpoint)

---

## Local Development Access

Since RDS is publicly accessible in public subnets:

**From your machine / Next.js app:**
1. **Whitelist your IP** in `doctalk-rds-sg` security group
2. Connect directly: `psql -h doctalk-db.xxxxx.rds.amazonaws.com -U postgres -d doctalk`
3. Your Next.js app connects the same way (via public endpoint)

**From Lambda:**
- Lambda connects via the **private IP** (same VPC, automatic routing)
- The `doctalk-lambda-sg` security group is already allowed in `doctalk-rds-sg`
- No VPC peering needed since both are in `doctalk-vpc`

If your IP changes, update the security group inbound rules.

---

## Next Steps

1. ✅ Infrastructure setup complete
2. 🔜 Deploy Lambda function code (I'll provide this)
3. 🔜 Create Next.js API routes
4. 🔜 Build dashboard UI

Let me know when infrastructure is ready!
