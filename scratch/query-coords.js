"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
async function main() {
    const client = new pg_1.Client({
        connectionString: 'postgresql://postgres:123123@localhost:5433/rescue_system?schema=public'
    });
    await client.connect();
    const userRes = await client.query('SELECT DISTINCT "provinceId" FROM "user"');
    console.log('DISTINCT user provinceIds:', userRes.rows);
    const teamRes = await client.query('SELECT DISTINCT "provinceId" FROM "rescue_team"');
    console.log('DISTINCT team provinceIds:', teamRes.rows);
    await client.end();
}
main().catch(console.error);
//# sourceMappingURL=query-coords.js.map