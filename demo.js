#!/usr/bin/env node

/**
 * LLM Comparison App Demo Script
 * 
 * This script demonstrates how to use the LLM Comparison App API
 * to add providers and test the functionality.
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Demo functions
async function demo() {
    console.log('🚀 LLM Comparison App Demo\n');
    
    const baseUrl = 'http://localhost:3000';
    
    try {
        // 1. Get current providers
        console.log('📋 Getting current providers...');
        const providers = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/providers',
            method: 'GET'
        });
        console.log('Current providers:', JSON.stringify(providers, null, 2));
        
        // 2. Add a demo provider (this will fail validation, showing error handling)
        console.log('\n❌ Testing validation with invalid data...');
        try {
            await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/providers',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, {
                name: '',
                baseUrl: 'invalid-url',
                apiKey: '',
                model: ''
            });
        } catch (error) {
            console.log('Expected validation error:', error.message);
        }
        
        // 3. Add a valid demo provider
        console.log('\n✅ Adding a valid demo provider...');
        const newProvider = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/providers',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            name: 'Demo Provider',
            baseUrl: 'https://api.demo.com/v1',
            apiKey: 'demo-api-key',
            model: 'demo-model'
        });
        console.log('Added provider:', JSON.stringify(newProvider, null, 2));
        
        // 4. Show final provider list
        console.log('\n📋 Final provider list...');
        const finalProviders = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/providers',
            method: 'GET'
        });
        console.log('All providers:', JSON.stringify(finalProviders, null, 2));
        
        console.log('\n🎉 Demo completed successfully!');
        console.log('\n📖 Next steps:');
        console.log('1. Open http://localhost:3000 in your browser');
        console.log('2. Go to the "Providers" page to add real API keys');
        console.log('3. Configure at least 2 providers with valid API keys');
        console.log('4. Use the "Comparison" page to test side-by-side responses');
        console.log('5. Watch real-time streaming and performance metrics');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        console.log('\n💡 Make sure the server is running with: npm start');
    }
}

// Run the demo
if (require.main === module) {
    demo();
}

module.exports = { demo };
