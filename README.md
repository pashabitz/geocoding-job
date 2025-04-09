
## Getting Started

Install dependencies:
```
npm install
```

Run the API service
```
npm run dev
```

Run the job processor
```
npx tsx jobs/worker.ts
```

To test from the command line, use the script /test/jobs.ts e.g.
```
npx tsx test/jobs.ts help
```

## Necessary Configuration
```
DATABASE_URL=

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
```