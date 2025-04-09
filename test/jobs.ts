import { program } from "commander";
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';

program
    .command("submit <filename>")
    .description("Submit a job")
    .action(async (filename) => {
        try {
            const filePath = path.resolve(filename);
            const fileContent = fs.readFileSync(filePath);
            
            const formData = new FormData();
            const blob = new Blob([fileContent], { type: 'application/octet-stream' });
            formData.append('file', blob, path.basename(filename));
            
            const response = await fetch(`${BASE_URL}/jobs`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            console.log(`Job submitted successfully. Response:`, data);
        } catch (error: any) {
            console.error(`Failed to submit job:`, error.message);
        }
    });

program.parse();