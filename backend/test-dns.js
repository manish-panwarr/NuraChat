import dns from 'dns';
import { promisify } from 'util';

const resolveSrv = promisify(dns.resolveSrv);

async function test() {
    try {
        console.log("Testing DNS resolution...");
        const records = await resolveSrv('_mongodb._tcp.cluster0.k4s2j61.mongodb.net');
        console.log("SRV Records:", records);
    } catch (err) {
        console.error("DNS Error:", err);
    }
}

test();
