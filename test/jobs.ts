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
            
            if (response.status !== 200) {
                console.error(`Error submitting job:`, data);
            } else {
                console.log(`Job submitted successfully. Response:`, data);
            }
        } catch (error: any) {
            console.error(`Failed to submit job:`, error.message);
        }
    });
program
    .command("get-job <jobId>")
    .description("Get job status")
    .action(async (jobId) => {
        try {
            const response = await fetch(`${BASE_URL}/jobs/${jobId}`);
            const data = await response.json();
            if (response.status !== 200) {
                console.error(`Error:`, data);
            } else {
                console.log(`Job status:`, data);
            }
        } catch (error: any) {
            console.error(`Failed to get job status:`, error.message);
        }
    });
program
    .command("get-results <jobId>")
    .description("Get job results")
    .option("--pageSize <size>", "Number of results per page")
    .option("--offset <offset>", "Offset for pagination, the id of the first result to return")
    .action(async (jobId, options) => {
        try {
            let url = `${BASE_URL}/jobs/${jobId}/results`;
            const queryStringParams = [];
            if (options.pageSize) {
                queryStringParams.push(`pageSize=${options.pageSize}`);
            }
            if (options.offset) {
                queryStringParams.push(`offset=${options.offset}`);
            }
            if (queryStringParams.length > 0) {
                url += `?${queryStringParams.join('&')}`;
            }
            console.log(url);
            const response = await fetch(url);
            const data = await response.json();
            if (response.status !== 200) {
                console.error(`Error:`, data);
            } else {
                console.log(`Job results:`, data);
            }
        } catch (error: any) {
            console.error(`Failed to get job results:`, error.message);
        }
    });

program.parse();