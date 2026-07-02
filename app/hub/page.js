export default function HubPage() {
  const tools = [
    { name: 'Daftar Aset', icon: '🏠', desc: 'Manajemen aset rumah tangga' },
    { name: 'Servis Kendaraan', icon: '🚗', desc: 'Jadwal dan riwayat servis' },
    { name: 'Catatan Anak', icon: '👶', desc: 'Perkembangan dan vaksinasi' },
    { name: 'To-Do List', icon: '📝', desc: 'Daftar belanja & tugas' },
  ];

  return (
    <div className="p-4 max-w-md mx-auto pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Hub</h1>
        <p className="text-sm text-neutral-400">Pusat Manajemen Rumah Tangga</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {tools.map((tool, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-3">{tool.icon}</span>
            <h3 className="font-medium text-neutral-800 text-sm">{tool.name}</h3>
            <p className="text-[10px] text-neutral-400 mt-1 leading-tight">{tool.desc}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center bg-neutral-100 rounded-2xl p-6 border border-neutral-200 border-dashed">
         <p className="text-sm text-neutral-500 font-medium">+ Tambah Modul Baru</p>
      </div>
    </div>
  );
}
