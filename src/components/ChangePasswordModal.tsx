import React, { useState } from 'react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail: string;
  onSuccess: (message: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  adminEmail,
  onSuccess,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanInputEmail = emailInput.trim().toLowerCase();
    const targetAdminEmail = (adminEmail || 'admin@siapin.com').trim().toLowerCase();

    // Check email confirmation
    // Allows matching current user email or default admin emails
    const validEmails = [
      targetAdminEmail,
      'safaria347@gmail.com',
      'admin@siapin.com',
      'admin@gmail.com',
      'ari.imam@daya-motora.com',
    ];

    if (!cleanInputEmail) {
      setError('Masukkan alamat email untuk konfirmasi.');
      return;
    }

    if (cleanInputEmail !== targetAdminEmail && !validEmails.includes(cleanInputEmail)) {
      setError(`Alamat email konfirmasi tidak sesuai. Harap masukkan email administrator Anda.`);
      return;
    }

    if (newPassword.length < 5) {
      setError('Password baru minimal 5 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      try {
        localStorage.setItem('SIAPIN_ADMIN_CUSTOM_PASSWORD', newPassword.trim());
        localStorage.setItem('SIAPIN_ADMIN_CUSTOM_PASSWORD_UPDATED', new Date().toISOString());
        setIsSubmitting(false);
        onSuccess('Password administrator berhasil diperbarui!');
        onClose();
      } catch (err) {
        setIsSubmitting(false);
        setError('Gagal menyimpan kata sandi. Silakan coba lagi.');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-left">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Ubah Password Administrator
            </h3>
            <p className="text-[11px] text-slate-300">
              Pengaturan keamanan akun admin SIAPIN
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded-md transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
            <span className="font-semibold block mb-0.5">Verifikasi Keamanan</span>
            Harap masukkan alamat email administrator Anda untuk memvalidasi perubahan kata sandi ini.
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Konfirmasi Email */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Konfirmasi Alamat Email Admin <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              required
              autoFocus
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Masukkan email administrator Anda"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-hidden bg-slate-50/50"
            />
          </div>

          {/* Password Baru */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password Baru <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 5 karakter"
                className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-hidden bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                {showPassword ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password Baru */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ulangi Password Baru <span className="text-red-600">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-hidden bg-slate-50/50"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-black active:bg-slate-800 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Password Baru</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
