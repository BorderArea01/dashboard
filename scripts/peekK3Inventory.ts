// Quick script to inspect K3 Cloud inventory data via Node (run with: npx tsx scripts/peekK3Inventory.ts)
import { queryAllWarehousesInventory } from '../services/k3cloud';

// Polyfill browser globals used inside k3cloud.ts (Node 20 already has globalThis.crypto/fetch)
if (!(globalThis as any).btoa) {
  (globalThis as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
if (!(globalThis as any).atob) {
  (globalThis as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

async function main() {
  const rows = await queryAllWarehousesInventory();
  console.log('Total rows:', rows.length);
  console.log('Sample 5 rows:', rows.slice(0, 5));
}

main().catch(err => {
  console.error('Failed to fetch K3 Cloud inventory:', err);
  process.exit(1);
});
