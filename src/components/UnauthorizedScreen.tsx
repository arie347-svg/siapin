import React from 'react';
import { UserRecord } from '../types';

interface UnauthorizedScreenProps {
  attemptedCode: string;
  availableUsers: UserRecord[];
  onSelectUser: (user: UserRecord) => void;
}

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({
  attemptedCode,
  availableUsers,
  onSelectUser,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-slate-200 p-6 sm:p-8 text-center">
        <div className="inline-block px-3 py-1 bg-red-50 text-red-700 rounded text-xs font-bold uppercase tracking-wider mb-3 border border-red-200">
          AKSES TIDAK DIKENALI
        </div>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Kode Transporter Tidak Valid
        </h1>

        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          Parameter <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">?t={attemptedCode}</span> tidak terdaftar dalam sistem distribusi armada.
        </p>

        <div className="mt-6 pt-5 border-t border-slate-100 text-left">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Pilih Profil Transporter Terdaftar:
          </p>

          <div className="space-y-2">
            {availableUsers.map((user) => (
              <button
                key={user.email}
                onClick={() => onSelectUser(user)}
                className="w-full flex items-center justify-between p-3 rounded-md border border-slate-200 hover:border-red-500 hover:bg-red-50/40 text-left transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      {user.kodeTransporter === 'ALL' ? 'Admin Pusat' : user.kodeTransporter}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                      {user.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {user.namaTransporter}
                  </div>
                </div>
                <span className="text-xs font-bold text-red-600">Pilih →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
