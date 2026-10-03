// Print agent: runs on the kitchen PC. Prints new KOTs on the thermal printer.
// Setup: npm i @supabase/supabase-js node-thermal-printer
// Run with PM2 so it auto-starts: pm2 start print-agent.js && pm2 startup
const { createClient } = require('@supabase/supabase-js');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Kitchen printer. LAN printer: 'tcp://192.168.1.50'. USB: use a printer:NAME interface.
const PRINTER = process.env.PRINTER_ADDR || 'tcp://192.168.1.50';

async function printKot(kot) {
  const p = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: PRINTER,
  });
  const { data: order } = await supabase
    .from('orders').select('order_no, type, locations(label)').eq('id', kot.order_id).single();

  p.alignCenter(); p.bold(true); p.println('KOT'); p.bold(false);
  p.println(`${order.type.toUpperCase()} - ${order.locations?.label ?? ''}`);
  p.println(new Date(kot.created_at).toLocaleString('en-IN'));
  p.drawLine();
  p.alignLeft();
  for (const i of kot.items) {
    p.bold(true); p.println(`${i.qty} x ${i.name}`); p.bold(false);
    if (i.note) p.println(`   * ${i.note}`);
  }
  p.drawLine(); p.cut();
  await p.execute();
}

// Claim atomically so a reconnect never prints twice.
async function claimAndPrint(kot) {
  const { data } = await supabase.from('kots')
    .update({ printed_at: new Date().toISOString() })
    .eq('id', kot.id).is('printed_at', null).select().single();
  if (!data) return; // someone else already printed it
  try {
    await printKot(data);
  } catch (e) {
    // Release the claim and record the error; the poller retries, and the dashboard can alert.
    await supabase.from('kots').update({ printed_at: null, print_error: String(e.message) }).eq('id', kot.id);
    console.error('Print failed', kot.id, e.message);
  }
}

// Instant path: realtime inserts
supabase.channel('kots')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kots' },
      (payload) => claimAndPrint(payload.new))
  .subscribe();

// Safety net: poll for anything unprinted (covers internet drops and failed prints)
setInterval(async () => {
  const { data } = await supabase.from('kots').select('*').is('printed_at', null).order('id').limit(20);
  for (const k of data ?? []) await claimAndPrint(k);
}, 5000);

console.log('Print agent running');
