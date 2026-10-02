import React from 'react';
import { TruckRecord } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  truck: TruckRecord | null;
  massTrucks?: TruckRecord[] | null;
  onClose: () => void;
  onConfirm: (truckId: string) => void;
  onConfirmMass?: (truckIds: string[]) => void;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  truck,
  massTrucks,
  onClose,
  onConfirm,
  onConfirmMass,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  const isMass = !!(massTrucks && massTrucks.length > 0);
  if (!isMass && !truck) return null;

  const count = isMass ? massTrucks!.length : 1;

  const handleConfirmAction = () => {
    if (isMass && onConfirmMass && massTrucks) {
      onConfirmMass(massTrucks.map((t) => t.id));
    } else if (truck) {
      onConfirm(truck.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center overflow-hidden">
        <div className="inline-block px-2.5 py-1 bg-red-50 text-red-700 rounded text-xs font-bold uppercase tracking-wider mb-3 border border-red-200">
          KONFIRMASI HAPUS
        </div>

        <h3 className="text-base font-bold text-slate-900">
          {isMass ? `Hapus ${count} Armada Terpilih?` : 'Hapus Unit Truk?'}
        </h3>

        {isMass && massTrucks ? (
          <div className="mt-2 text-xs text-slate-600">
            <p>
              Anda akan menghapus <strong className="text-slate-900 font-bold">{count} armada</strong> dari sistem monitoring.
            </p>
            <div className="mt-3 flex flex-wrap gap-1 justify-center max-h-24 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200 font-mono text-[11px]">
              {massTrucks.slice(0, 6).map((t) => (
                <span
                  key={t.id}
                  className="px-1.5 py-0.5 bg-white border border-slate-300 text-slate-800 font-bold rounded"
                >
                  {t.nomorPolisi}
                </span>
              ))}
              {massTrucks.length > 6 && (
                <span className="px-1.5 py-0.5 text-slate-500 font-bold">
                  +{massTrucks.length - 6} lainnya
                </span>
              )}
            </div>
            <p className="mt-2 text-red-600 font-bold text-[11px]">
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        ) : truck ? (
          <p className="text-xs text-slate-600 mt-2">
            Anda akan menghapus armada{' '}
            <strong className="text-slate-900 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">
              {truck.nomorPolisi}
            </strong>{' '}
            ({truck.namaSopir}). Tindakan ini tidak dapat dibatalkan.
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2 px-3 rounded-md border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmAction}
            disabled={isDeleting}
            className="flex-1 py-2 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            {isDeleting ? 'Menghapus...' : isMass ? `Ya, Hapus (${count})` : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
};
