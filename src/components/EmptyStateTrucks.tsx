import React from 'react';

interface EmptyStateTrucksProps {
  searchQuery?: string;
  statusFilter?: 'ALL' | 'Aktif' | 'Nonaktif';
  readinessFilter?: 'ALL' | 'Ready' | 'Tidak Ready';
  selectedVendorFilter?: string;
  isLocked: boolean;
  onResetFilters?: () => void;
  onOpenAddModal?: () => void;
}

export const EmptyStateTrucks: React.FC<EmptyStateTrucksProps> = ({
  searchQuery = '',
  statusFilter = 'ALL',
  readinessFilter = 'ALL',
  selectedVendorFilter = 'ALL',
  isLocked,
  onResetFilters,
  onOpenAddModal,
}) => {
  const hasSearch = searchQuery.trim().length > 0;
  const hasStatusFilter = statusFilter !== 'ALL';
  const hasReadinessFilter = readinessFilter !== 'ALL';
  const hasVendorFilter = selectedVendorFilter !== 'ALL';
  const isFiltered = hasSearch || hasStatusFilter || hasReadinessFilter || hasVendorFilter;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8 text-center w-full max-w-xl mx-auto my-6">
      <div className="inline-block px-3 py-1 bg-red-50 text-red-700 font-bold text-xs uppercase tracking-wider rounded mb-3">
        DATA ARMADA
      </div>

      <h3 className="text-base font-bold text-slate-800">
        {isFiltered ? 'Tidak Ada Armada yang Sesuai Filter' : 'Belum Ada Data Armada'}
      </h3>

      <div className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        {hasSearch ? (
          <p>
            Tidak ditemukan armada yang cocok dengan kata kunci{' '}
            <strong className="text-slate-800 font-semibold">"{searchQuery}"</strong>.
          </p>
        ) : isFiltered ? (
          <p>
            Tidak ada unit truk yang memenuhi kriteria filter yang sedang aktif. Silakan reset filter untuk melihat semua armada.
          </p>
        ) : (
          <p>
            Daftar armada truk saat ini masih kosong. Data akan terisi otomatis saat sinkronisasi AppSheet aktif.
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
        {isFiltered && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Reset Semua Filter
          </button>
        )}

        {onOpenAddModal && (
          <button
            type="button"
            disabled={isLocked}
            onClick={onOpenAddModal}
            className={`px-4 py-2 rounded-md text-xs font-bold transition shadow-xs ${
              isLocked
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
            }`}
          >
            + Tambah Truk Baru
          </button>
        )}
      </div>
    </div>
  );
};
