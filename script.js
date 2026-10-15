const $ = s => document.querySelector(s);
const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NAMA_TOKO = 'SUPERMARKET SEJAHTERA';
const SEED = [
 {kode:'8991001',nama:'Beras Premium 5 kg',kat:'Sembako',harga:72000,stok:40},
 {kode:'8991002',nama:'Minyak Goreng 1 L',kat:'Sembako',harga:18500,stok:60},
 {kode:'8991003',nama:'Gula Pasir 1 kg',kat:'Sembako',harga:16500,stok:50},
 {kode:'8991004',nama:'Telur Ayam 1 kg',kat:'Sembako',harga:29000,stok:30},
 {kode:'8992001',nama:'Susu UHT Coklat 250 ml',kat:'Minuman',harga:6500,stok:80},
 {kode:'8992002',nama:'Air Mineral 600 ml',kat:'Minuman',harga:3500,stok:120},
 {kode:'8992003',nama:'Teh Botol 450 ml',kat:'Minuman',harga:5500,stok:70},
 {kode:'8992004',nama:'Kopi Sachet (10 pcs)',kat:'Minuman',harga:14000,stok:45},
 {kode:'8993001',nama:'Mie Instan Goreng',kat:'Makanan',harga:3200,stok:150},
 {kode:'8993002',nama:'Biskuit Kelapa 300 g',kat:'Makanan',harga:11500,stok:35},
 {kode:'8993003',nama:'Keripik Kentang 70 g',kat:'Makanan',harga:9800,stok:40},
 {kode:'8993004',nama:'Roti Tawar',kat:'Makanan',harga:15500,stok:20},
 {kode:'8994001',nama:'Sabun Mandi Batang',kat:'Kebersihan',harga:4500,stok:90},
 {kode:'8994002',nama:'Shampoo 170 ml',kat:'Kebersihan',harga:21500,stok:30},
 {kode:'8994003',nama:'Deterjen 800 g',kat:'Kebersihan',harga:23000,stok:25},
 {kode:'8994004',nama:'Pasta Gigi 120 g',kat:'Kebersihan',harga:12500,stok:5}
];

// ---------- penyimpanan ----------
function muat(k, def){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch(e){ return def; } }
function simpan(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
let produk = muat('ks_produk', SEED);
let riwayat = muat('ks_riwayat', []);
let cart = {};            // kode -> qty
let katAktif = '';
let terakhir = null;   // barang yang baru ditambahkan (untuk sorotan baris)
let editKode = null;

// ---------- util ----------
const toast = new bootstrap.Toast($('#toast'), {delay: 1800});
function info(t){ $('#toastIsi').textContent = t; toast.show(); }
const cari = k => produk.find(p => p.kode === k);
setInterval(() => $('#jam').textContent = new Date().toLocaleString('id-ID',{dateStyle:'full',timeStyle:'medium'}), 1000);

// ---------- tab ----------
document.querySelectorAll('#tabs .nav-link').forEach(a => a.onclick = e => {
  e.preventDefault();
  document.querySelectorAll('#tabs .nav-link').forEach(x => x.classList.toggle('active', x === a));
  ['kasir','produk','riwayat'].forEach(t => $('#tab-'+t).classList.toggle('d-none', t !== a.dataset.tab));
  if (a.dataset.tab === 'produk') renderTabel();
  if (a.dataset.tab === 'riwayat') renderRiwayat();
});

// ---------- kasir: katalog ----------
function renderKategori(){
  const kats = [...new Set(produk.map(p => p.kat))];
  $('#cKat').innerHTML = '<option value="">Semua kategori</option>' + kats.map(k => `<option>${esc(k)}</option>`).join('');
  $('#cKat').value = katAktif;
  $('#dlKat').innerHTML = kats.map(k => `<option value="${esc(k)}">`).join('');
}
function renderCari(){
  const q = $('#cQ').value.trim().toLowerCase(), kat = $('#cKat').value;
  const list = produk.filter(p => (!kat || p.kat === kat) && (!q || p.nama.toLowerCase().includes(q) || p.kode.includes(q)));
  $('#cList').innerHTML = list.length ? list.map(p => `<tr>
    <td>${esc(p.kode)}</td><td>${esc(p.nama)}</td><td>${esc(p.kat)}</td>
    <td class="text-end">${rp(p.harga)}</td>
    <td class="text-end ${p.stok<=10?'text-danger fw-bold':''}">${p.stok}</td>
    <td class="text-end"><button class="btn btn-sm btn-primary" data-add="${esc(p.kode)}" ${p.stok<=0?'disabled':''}>${p.stok<=0?'Habis':'Tambah'}</button></td></tr>`).join('')
    : '<tr><td colspan="6" class="kosong">Barang tidak ditemukan.</td></tr>';
  $('#cList').querySelectorAll('[data-add]').forEach(b => b.onclick = () => tambah(b.dataset.add));
}
function renderGrid(){ renderCari(); }
const mCari = new bootstrap.Modal($('#mCari'));
function bukaCari(q){ $('#cQ').value = q || ''; renderCari(); mCari.show(); }
$('#mCari').addEventListener('shown.bs.modal', () => $('#cQ').focus());
$('#mCari').addEventListener('hidden.bs.modal', () => $('#cari').focus());
$('#cQ').addEventListener('input', renderCari);
$('#cKat').addEventListener('change', e => { katAktif = e.target.value; renderCari(); });
$('#btnLookup').onclick = () => bukaCari($('#cari').value.trim());
$('#cari').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const q = $('#cari').value.trim();
  if (!q) return;
  let p = cari(q);
  if (!p) {
    const m = produk.filter(x => x.nama.toLowerCase().includes(q.toLowerCase()));
    if (m.length === 1) p = m[0];
    else if (m.length > 1) { $('#cari').value = ''; return bukaCari(q); }
  }
  if (p) { tambah(p.kode); $('#cari').value = ''; }
  else info('Barang tidak ditemukan: ' + q);
});

// ---------- kasir: keranjang ----------
function tambah(kode){
  const p = cari(kode);
  if (!p) return;
  const q = (cart[kode] || 0) + 1;
  if (q > p.stok) return info('Stok ' + p.nama + ' tidak cukup');
  cart[kode] = q;
  terakhir = kode; renderCart(); terakhir = null;
}
function ubahQty(kode, d){
  const p = cari(kode), q = (cart[kode] || 0) + d;
  if (q <= 0) delete cart[kode];
  else if (q > p.stok) return info('Stok ' + p.nama + ' hanya ' + p.stok);
  else cart[kode] = q;
  renderCart();
}
function hitung(){
  const sub = Object.entries(cart).reduce((s,[k,q]) => s + cari(k).harga * q, 0);
  const persen = Math.min(100, Math.max(0, +$('#diskon').value || 0));
  const disk = sub * persen / 100;
  const ppn = $('#ppn').value === '1' ? (sub - disk) * 0.11 : 0;
  return {sub, disk, ppn, total: sub - disk + ppn, persen};
}
function renderCart(){
  const ent = Object.entries(cart);
  $('#isiKeranjang').innerHTML = ent.length ? ent.map(([k,q], n) => {
    const p = cari(k);
    return `<tr class="${k===terakhir?'baru':''}"><td>${n+1}</td><td>${esc(k)}</td><td class="fw-semibold">${esc(p.nama)}</td>
      <td class="text-end">${p.harga.toLocaleString('id-ID')}</td>
      <td class="text-center text-nowrap"><button class="btn btn-outline-secondary qty-btn" data-k="${esc(k)}" data-d="-1">−</button><span class="mx-2 fw-bold">${q}</span><button class="btn btn-outline-secondary qty-btn" data-k="${esc(k)}" data-d="1">+</button></td>
      <td class="text-end fw-semibold">${(p.harga*q).toLocaleString('id-ID')}</td>
      <td><button class="btn btn-sm text-danger" data-hapus="${esc(k)}" title="Hapus"><i class="bi bi-x-lg"></i></button></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="kosong">Belum ada barang. Scan barcode untuk memulai transaksi.</td></tr>';
  $('#isiKeranjang').querySelectorAll('[data-d]').forEach(b => b.onclick = () => ubahQty(b.dataset.k, +b.dataset.d));
  $('#isiKeranjang').querySelectorAll('[data-hapus]').forEach(b => b.onclick = () => { delete cart[b.dataset.hapus]; renderCart(); });
  const h = hitung();
  $('#tSub').textContent = rp(h.sub); $('#tDisk').textContent = '- ' + rp(h.disk);
  $('#tPpn').textContent = rp(h.ppn); $('#tTotal').textContent = rp(h.total);
  $('#tItem').textContent = Object.values(cart).reduce((a, b) => a + b, 0) + ' item';
  const t = Math.round(h.total);
  const opsi = [...new Set([t, Math.ceil(t/10000)*10000, Math.ceil(t/50000)*50000, Math.ceil(t/100000)*100000])].filter(x => x > 0);
  $('#uangCepat').innerHTML = opsi.map(x => `<button class="btn btn-sm btn-outline-dark" data-u="${x}">${x===t?'Uang pas':rp(x)}</button>`).join('');
  $('#uangCepat').querySelectorAll('button').forEach(b => b.onclick = () => { $('#bayar').value = b.dataset.u; hitungKembali(); });
  hitungKembali();
}
function hitungKembali(){
  const k = (+$('#bayar').value || 0) - Math.round(hitung().total);
  $('#tKembali').textContent = rp(Math.max(0, k));
  $('#tKembali').className = k < 0 && $('#bayar').value ? 'text-danger' : 'text-success';
}
$('#bayar').addEventListener('input', hitungKembali);
$('#diskon').addEventListener('input', renderCart);
$('#ppn').addEventListener('change', renderCart);
$('#btnKosong').onclick = () => { cart = {}; $('#bayar').value = ''; renderCart(); };

// ---------- pembayaran ----------
function bayar(){
  if (!Object.keys(cart).length) return info('Keranjang masih kosong');
  const h = hitung(), total = Math.round(h.total), uang = +$('#bayar').value || 0;
  if (uang < total) return info('Uang kurang ' + rp(total - uang));
  const items = Object.entries(cart).map(([k,q]) => { const p = cari(k); p.stok -= q; return {kode:k, nama:p.nama, harga:p.harga, qty:q}; });
  const trx = {id:'TRX' + Date.now().toString().slice(-8), waktu:new Date().toISOString(), items,
    sub:h.sub, persen:h.persen, disk:h.disk, ppn:h.ppn, total, bayar:uang, kembali:uang - total};
  riwayat.unshift(trx);
  simpan('ks_produk', produk); simpan('ks_riwayat', riwayat);
  cart = {}; $('#bayar').value = ''; $('#diskon').value = 0;
  renderCart(); renderGrid(); tampilStruk(trx);
  if ($('#autoPdf').checked) setTimeout(pdfStruk, 300);
  if ($('#autoCetak').checked) setTimeout(cetakStruk, 900);
}
$('#btnBayar').onclick = bayar;
let strukAktif = null;
function strukHTML(t){
  const b = (a, c, tebal) => `<div style="display:flex;justify-content:space-between;gap:6px${tebal?';font-weight:bold':''}"><span>${a}</span><span>${c}</span></div>`;
  const garis = '<div style="border-top:1px dashed #000;margin:4px 0"></div>';
  return `<div style="text-align:center;font-weight:bold">${NAMA_TOKO}</div>
    <div style="text-align:center">Jl. Contoh No. 1</div>${garis}
    ${b(esc(t.id), '')}${b(new Date(t.waktu).toLocaleString('id-ID'), '')}${garis}
    ${t.items.map(i => `<div>${esc(i.nama)}</div>${b(i.qty + ' x ' + i.harga.toLocaleString('id-ID'), (i.qty*i.harga).toLocaleString('id-ID'))}`).join('')}
    ${garis}
    ${b('Subtotal', rp(t.sub))}
    ${t.disk ? b('Diskon ' + t.persen + '%', '-' + rp(t.disk)) : ''}
    ${t.ppn ? b('PPN 11%', rp(t.ppn)) : ''}
    ${b('TOTAL', rp(t.total), true)}
    ${b('Bayar', rp(t.bayar))}${b('Kembali', rp(t.kembali))}${garis}
    <div style="text-align:center">Terima kasih, selamat berbelanja!</div>`;
}
function tampilStruk(t){
  strukAktif = t;
  $('#struk').innerHTML = strukHTML(t);
  bootstrap.Modal.getOrCreateInstance($('#mStruk')).show();
}
function cetakStruk(){
  if (!strukAktif) return;
  const lebar = +$('#kertas').value;
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const d = f.contentWindow.document;
  d.open();
  d.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(strukAktif.id)}</title>
    <style>@page{size:${lebar}mm auto;margin:2mm}body{margin:0;width:${lebar-6}mm;font:12px/1.35 "Courier New",monospace;color:#000}</style>
    </head><body>${strukHTML(strukAktif)}</body></html>`);
  d.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 250);
}
function pdfStruk(){
  if (!strukAktif) return;
  if (!window.jspdf) return info('Library PDF belum termuat. Periksa koneksi internet.');
  const t = strukAktif, lebar = +$('#kertas').value, cols = Math.floor((lebar - 6) / 1.69);
  const baris = [];                                   // {t: teks, b: tebal}
  const add = (x, b) => baris.push({t: x, b: !!b});
  const tengah = (x, b) => add(' '.repeat(Math.max(0, Math.floor((cols - x.length) / 2))) + x, b);
  const kiriKanan = (a, c, b) => { if (a.length + c.length + 1 > cols) a = a.slice(0, cols - c.length - 1); add(a + ' '.repeat(cols - a.length - c.length) + c, b); };
  const garis = () => add('-'.repeat(cols));
  const angka = n => Math.round(n).toLocaleString('id-ID');
  tengah(NAMA_TOKO, true); tengah('Jl. Contoh No. 1'); garis();
  add(t.id); add(new Date(t.waktu).toLocaleString('id-ID')); garis();
  t.items.forEach(i => {
    for (let k = 0; k < i.nama.length; k += cols) add(i.nama.slice(k, k + cols));
    kiriKanan(i.qty + ' x ' + angka(i.harga), angka(i.qty * i.harga));
  });
  garis();
  kiriKanan('Subtotal', rp(t.sub));
  if (t.disk) kiriKanan('Diskon ' + t.persen + '%', '-' + rp(t.disk));
  if (t.ppn) kiriKanan('PPN 11%', rp(t.ppn));
  kiriKanan('TOTAL', rp(t.total), true);
  kiriKanan('Bayar', rp(t.bayar)); kiriKanan('Kembali', rp(t.kembali)); garis();
  tengah('Terima kasih,'); tengah('selamat berbelanja!');
  const lh = 3.6, tinggi = baris.length * lh + 12;
  const doc = new window.jspdf.jsPDF({unit: 'mm', format: [lebar, tinggi]});
  doc.setFontSize(8);
  baris.forEach((r, i) => { doc.setFont('courier', r.b ? 'bold' : 'normal'); doc.text(r.t, 3, 6 + i * lh); });
  doc.save('struk-' + t.id + '.pdf');
}
$('#btnPdf').onclick = pdfStruk;
$('#autoPdf').checked = muat('ks_autopdf', false);
$('#autoPdf').onchange = e => simpan('ks_autopdf', e.target.checked);
$('#btnCetak').onclick = cetakStruk;
$('#autoCetak').checked = muat('ks_auto', false);
$('#autoCetak').onchange = e => simpan('ks_auto', e.target.checked);
$('#kertas').value = muat('ks_kertas', '80');
$('#kertas').onchange = e => simpan('ks_kertas', e.target.value);

// ---------- data barang ----------
function renderTabel(){
  $('#tbProduk').innerHTML = produk.map(p => `<tr>
    <td>${esc(p.kode)}</td><td>${esc(p.nama)}</td><td>${esc(p.kat)}</td>
    <td class="text-end">${rp(p.harga)}</td>
    <td class="text-end ${p.stok<=10?'text-danger fw-bold':''}">${p.stok}</td>
    <td class="text-end text-nowrap">
      <button class="btn btn-sm btn-outline-primary" data-e="${esc(p.kode)}">Ubah</button>
      <button class="btn btn-sm btn-outline-danger" data-x="${esc(p.kode)}">Hapus</button></td></tr>`).join('');
  $('#tbProduk').querySelectorAll('[data-e]').forEach(b => b.onclick = () => bukaForm(b.dataset.e));
  $('#tbProduk').querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
    const p = cari(b.dataset.x);
    if (confirm('Hapus ' + p.nama + '?')) { produk = produk.filter(x => x !== p); delete cart[p.kode]; simpan('ks_produk', produk); renderTabel(); renderKategori(); renderGrid(); renderCart(); }
  });
}
const mBarang = new bootstrap.Modal($('#mBarang'));
function bukaForm(kode){
  editKode = kode || null;
  const p = kode ? cari(kode) : {kode:'', nama:'', kat:'', harga:'', stok:''};
  $('#mJudul').textContent = kode ? 'Ubah barang' : 'Tambah barang';
  $('#fKode').value = p.kode; $('#fNama').value = p.nama; $('#fKat').value = p.kat; $('#fHarga').value = p.harga; $('#fStok').value = p.stok;
  mBarang.show();
}
$('#btnTambah').onclick = () => bukaForm();
$('#btnSimpan').onclick = () => {
  const d = {kode:$('#fKode').value.trim(), nama:$('#fNama').value.trim(), kat:$('#fKat').value.trim() || 'Lainnya',
    harga:+$('#fHarga').value, stok:+$('#fStok').value};
  if (!d.kode || !d.nama || d.harga < 0 || d.stok < 0 || isNaN(d.harga) || isNaN(d.stok)) return info('Lengkapi kode, nama, harga, dan stok');
  if (cari(d.kode) && d.kode !== editKode) return info('Kode barang sudah dipakai');
  if (editKode) { Object.assign(cari(editKode), d); if (cart[editKode] && editKode !== d.kode) { cart[d.kode] = cart[editKode]; delete cart[editKode]; } }
  else produk.push(d);
  simpan('ks_produk', produk); mBarang.hide();
  renderTabel(); renderKategori(); renderGrid(); renderCart(); info('Barang disimpan');
};

// ---------- riwayat ----------
function renderRiwayat(){
  const hariIni = riwayat.filter(t => new Date(t.waktu).toDateString() === new Date().toDateString());
  $('#rCount').textContent = hariIni.length;
  $('#rOmzet').textContent = rp(hariIni.reduce((s,t) => s + t.total, 0));
  $('#tbRiwayat').innerHTML = riwayat.length ? riwayat.map(t => `<tr>
    <td>${esc(t.id)}</td><td>${new Date(t.waktu).toLocaleString('id-ID')}</td>
    <td class="text-end">${t.items.reduce((s,i) => s + i.qty, 0)}</td><td class="text-end">${rp(t.total)}</td>
    <td class="text-end"><button class="btn btn-sm btn-outline-secondary" data-s="${esc(t.id)}">Lihat struk</button></td></tr>`).join('')
    : '<tr><td colspan="5" class="text-center text-muted py-4">Belum ada transaksi.</td></tr>';
  $('#tbRiwayat').querySelectorAll('[data-s]').forEach(b => b.onclick = () => tampilStruk(riwayat.find(t => t.id === b.dataset.s)));
}
$('#btnHapusRiwayat').onclick = () => { if (confirm('Hapus semua riwayat transaksi?')) { riwayat = []; simpan('ks_riwayat', riwayat); renderRiwayat(); } };

// ---------- shortcut ----------
document.addEventListener('keydown', e => {
  if (e.key === 'F2') { e.preventDefault(); $('#cari').focus(); }
  if (e.key === 'F3') { e.preventDefault(); bukaCari(); }
  if (e.key === 'F9') { e.preventDefault(); bayar(); }
});

renderKategori(); renderGrid(); renderCart();
$('#cari').focus();