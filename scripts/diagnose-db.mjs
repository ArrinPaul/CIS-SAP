import dotenv from 'dotenv';
import dns from 'node:dns/promises';
import net from 'node:net';

dotenv.config();

async function checkTcp(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ ok: true, message: 'Connected successfully' });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ ok: false, message: `Timeout after ${timeoutMs}ms` });
      }
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ ok: false, message: err.message });
      }
    });

    socket.connect(port, host);
  });
}

async function runDiagnostics() {
  console.log('--- SUPABASE DIAGNOSTICS ---');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  const poolerUrl = process.env.DATABASE_POOLER_URL;

  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || 'NOT SET');
  
  if (supabaseUrl) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: anonKey ? { apikey: anonKey } : {},
      });
      console.log(`[HTTP Health Check] ${supabaseUrl} -> Status ${res.status} (${res.ok ? 'OK' : 'FAIL'})`);
    } catch (err) {
      console.error(`[HTTP Health Check] ${supabaseUrl} -> ERROR: ${err.message}`);
    }
  }

  const projectRef = supabaseUrl ? supabaseUrl.replace(/https?:\/\//, '').split('.')[0] : null;
  console.log('Project Ref:', projectRef || 'Unknown');

  const targets = [
    { host: 'aws-1-ap-northeast-1.pooler.supabase.com', port: 6543, desc: 'Current Pooler (port 6543)' },
    { host: 'aws-1-ap-northeast-1.pooler.supabase.com', port: 5432, desc: 'Current Pooler (port 5432)' },
    { host: 'aws-0-ap-northeast-1.pooler.supabase.com', port: 6543, desc: 'Alternative Pooler aws-0 (port 6543)' },
    { host: 'aws-0-ap-northeast-1.pooler.supabase.com', port: 5432, desc: 'Alternative Pooler aws-0 (port 5432)' },
  ];

  if (projectRef) {
    targets.push(
      { host: `db.${projectRef}.supabase.co`, port: 5432, desc: `Direct DB (db.${projectRef}.supabase.co:5432)` },
      { host: `aws-0-${projectRef}.pooler.supabase.com`, port: 6543, desc: `Custom Pooler (aws-0-${projectRef}:6543)` }
    );
  }

  console.log('\n--- TESTING TCP REACHABILITY ---');
  for (const t of targets) {
    try {
      const addresses = await dns.lookup(t.host).catch(() => null);
      if (!addresses) {
        console.log(`❌ [DNS FAILED] ${t.desc} -> ${t.host}`);
        continue;
      }
      const tcpResult = await checkTcp(t.host, t.port, 4000);
      if (tcpResult.ok) {
        console.log(`✅ [TCP OPEN] ${t.desc} -> ${t.host}:${t.port} (IP: ${addresses.address})`);
      } else {
        console.log(`❌ [TCP FAILED] ${t.desc} -> ${t.host}:${t.port} (IP: ${addresses.address}) -> ${tcpResult.message}`);
      }
    } catch (err) {
      console.log(`❌ [ERROR] ${t.desc} -> ${err.message}`);
    }
  }

  console.log('\n--- DIAGNOSTICS COMPLETE ---');
}

runDiagnostics();
