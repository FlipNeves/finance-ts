import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImportSource } from '../../../types/api';

type StatementUploadStepProps = {
  bankAccounts: string[];
  loading: boolean;
  error?: string | null;
  onAnalyze: (source: ImportSource, bankAccount: string) => void;
};

export default function StatementUploadStep({
  bankAccounts,
  loading,
  error,
  onAnalyze,
}: StatementUploadStepProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csv, setCsv] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const isPdf =
      file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (isPdf) {
      // PDFs are binary — keep the File and let the backend extract the text.
      setPdfFile(file);
      setCsv('');
      return;
    }

    setPdfFile(null);
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      // Try UTF-8 first; many Brazilian bank exports are Latin-1 (windows-1252),
      // which would otherwise produce mojibake on accented headers/descriptions.
      let text = new TextDecoder('utf-8').decode(buf);
      if (text.includes('�')) {
        text = new TextDecoder('windows-1252').decode(buf);
      }
      setCsv(text);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAnalyze = () => {
    if (pdfFile) onAnalyze({ kind: 'pdf', file: pdfFile }, bankAccount);
    else onAnalyze({ kind: 'csv', csv }, bankAccount);
  };

  const canAnalyze = (pdfFile !== null || csv.trim().length > 0) && !loading;

  return (
    <div className="si-step">
      <h3 className="si-step-title">{t('transactions.import.uploadTitle')}</h3>
      <p className="si-hint">{t('transactions.import.uploadHint')}</p>

      <div className="si-field">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,.pdf,application/pdf"
          className="si-file-input"
          onChange={handleFile}
        />
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => fileInputRef.current?.click()}
        >
          {t('transactions.import.chooseFile')}
        </button>
        {fileName && <span className="si-file-name">{fileName}</span>}
      </div>

      {pdfFile && (
        <p className="si-hint">{t('transactions.import.pdfSelected')}</p>
      )}

      <div className="si-field">
        <label className="form-label">{t('transactions.import.orPaste')}</label>
        <textarea
          className="form-control si-textarea"
          rows={6}
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            // Typing/pasting CSV supersedes a chosen PDF.
            if (pdfFile) setPdfFile(null);
            if (fileName) setFileName('');
          }}
          placeholder={t('transactions.import.pastePlaceholder')}
        />
      </div>

      {bankAccounts.length > 0 && (
        <div className="si-field">
          <label className="form-label">{t('transactions.import.defaultAccount')}</label>
          <select
            className="form-control"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
          >
            <option value="">—</option>
            {bankAccounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="si-error">{error}</p>}

      <button
        type="button"
        className="btn btn-primary si-full-btn"
        disabled={!canAnalyze}
        onClick={handleAnalyze}
      >
        {loading ? t('transactions.import.analyzing') : t('transactions.import.analyze')}
      </button>
    </div>
  );
}
