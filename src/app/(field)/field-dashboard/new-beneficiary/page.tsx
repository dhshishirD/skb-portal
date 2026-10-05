'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  WifiOff, 
  MapPin, 
  Camera, 
  Save, 
  Send, 
  CheckCircle2, 
  Navigation,
  UserCheck,
  FileSpreadsheet,
  ArrowLeft
} from 'lucide-react';
import { saveOfflineReport } from '@/lib/offline/db';
import { BeneficiaryService } from '@/server/services/beneficiaryService';

export default function NewBeneficiaryRegistrationPage() {
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [householdSize, setHouseholdSize] = useState('5');
  const [projectId, setProjectId] = useState('SKB-2026-WASH-001');
  const [reportTitle, setReportTitle] = useState('Field Intake & Distribution');
  const [summary, setSummary] = useState('');
  const [nidPhoto, setNidPhoto] = useState<string | null>(null);
  const [beneficiaryPhoto, setBeneficiaryPhoto] = useState<string | null>(null);
  
  const [latitude, setLatitude] = useState<number | undefined>(21.4272);
  const [longitude, setLongitude] = useState<number | undefined>(92.0058);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFetchLocation = () => {
    if ('geolocation' in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(4)));
          setLongitude(Number(pos.coords.longitude.toFixed(4)));
          setLocating(false);
        },
        () => {
          setLocating(false);
        }
      );
    }
  };

  const handlePhotoCapture = (type: 'nid' | 'beneficiary', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'nid') setNidPhoto(reader.result as string);
        else setBeneficiaryPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      beneficiary_name: beneficiaryName,
      national_id: nationalId,
      household_size: Number(householdSize),
      project_id: projectId,
      report_title: reportTitle,
      summary,
      nid_photo: nidPhoto ? 'captured_image_data' : null,
      beneficiary_photo: beneficiaryPhoto ? 'captured_image_data' : null,
      gpsLatitude: latitude,
      gpsLongitude: longitude,
    };

    const id = crypto.randomUUID();
    saveOfflineReport({
      id,
      projectId,
      period: '2026-09',
      gpsLatitude: latitude,
      gpsLongitude: longitude,
      payload,
      createdAt: new Date().toISOString(),
    });

    // Save to central beneficiary service (Database + localStorage)
    await BeneficiaryService.addBeneficiary({
      fullName: beneficiaryName || 'Registered Field Beneficiary',
      nationalId: nationalId || '1990000000000',
      phone: '01700000000',
      sex: 'female',
      birthYear: 1992,
      locationCode: projectId.includes('TEKNAF') ? 'UP-TEKNAF' : projectId.includes('KURIGRAM') ? 'UP-KURIGRAM' : 'UP-UKHIYA',
      projectId: projectId,
      householdSize: Number(householdSize) || 5,
      summary: summary || 'Registered in field intake survey.',
      consentCaptured: true,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setMsg('Beneficiary Registration saved & synced to Central Registry!');
      // Reset form
      setBeneficiaryName('');
      setNationalId('');
      setSummary('');
      setNidPhoto(null);
      setBeneficiaryPhoto(null);
    }, 800);
  };

  return (
    <div className="space-y-4 text-slate-100 pb-8">
      {/* Top Title & Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/field-dashboard" className="text-xs text-emerald-300 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Workspace
        </Link>
        <span className="text-[10px] bg-emerald-800 border border-emerald-600 px-2 py-0.5 rounded flex items-center gap-1">
          <WifiOff className="w-3 h-3 text-amber-400" /> Offline Sync Ready
        </span>
      </div>

      <div className="bg-emerald-900/80 border border-emerald-700 p-4 rounded-2xl space-y-1">
        <h1 className="text-base font-extrabold text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-emerald-400" /> Beneficiary Registration (KoBo Schema)
        </h1>
        <p className="text-xs text-emerald-200">
          Matches all 8 fields defined in your KoBoToolbox survey form.
        </p>
      </div>

      {msg && (
        <div className="bg-emerald-800/90 border border-emerald-500 p-3 rounded-xl text-xs text-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-emerald-900/60 p-4 rounded-2xl border border-emerald-800">
        
        {/* 1. Beneficiary Full Name */}
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">
            1. Beneficiary Full Name (`beneficiary_name`) *
          </label>
          <input
            type="text"
            value={beneficiaryName}
            onChange={(e) => setBeneficiaryName(e.target.value)}
            placeholder="e.g. Anowar Hossain"
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-xl p-3 focus:border-emerald-400 outline-none"
            required
          />
        </div>

        {/* 2. National ID / Birth Certificate */}
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">
            2. National ID / Birth Certificate (`national_id`) *
          </label>
          <input
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="e.g. 1992269123456"
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-xl p-3 focus:border-emerald-400 outline-none"
            required
          />
        </div>

        {/* 3. Household Size */}
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">
            3. Household Size (`household_size`)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={householdSize}
            onChange={(e) => setHouseholdSize(e.target.value)}
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-xl p-3 focus:border-emerald-400 outline-none"
            required
          />
        </div>

        {/* 4. SKB Project Code */}
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">
            4. SKB Project Code (`project_id`) *
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-xl p-3 focus:border-emerald-400 outline-none"
          >
            <option value="SKB-2026-WASH-001">SKB-2026-WASH-001 • Rohingya Camp Water (Teknaf)</option>
            <option value="SKB-2026-HEALTH-002">SKB-2026-HEALTH-002 • Primary Health Clinics (Ukhiya)</option>
            <option value="SKB-2026-EDU-003">SKB-2026-EDU-003 • Primary School WASH (Kurigram)</option>
            <option value="SKB-2026-LIV-004">SKB-2026-LIV-004 • Winter Relief & Livelihood (Sylhet)</option>
          </select>
        </div>

        {/* 5. Activity Title */}
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">
            5. Activity Title (`report_title`)
          </label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="e.g. Field Intake & Hygiene Kit Distribution"
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-xl p-3 focus:border-emerald-400 outline-none"
          />
        </div>

        {/* 6. GPS Location */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-emerald-200">6. GPS Location</label>
            <button
              type="button"
              onClick={handleFetchLocation}
              className="text-[10px] bg-emerald-800 hover:bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 transition"
            >
              <Navigation className="w-3 h-3 text-emerald-400" /> {locating ? 'Locating...' : 'Auto-Locate GPS'}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950 p-2.5 rounded-xl text-xs font-mono text-emerald-300 border border-emerald-700">
            <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Lat: {latitude}, Long: {longitude}</span>
          </div>
        </div>

        {/* 7. NID Card Photo */}
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">
            7. NID Card / Birth Certificate Photo (`nid_photo`)
          </label>
          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer bg-emerald-950 hover:bg-emerald-900 border border-dashed border-emerald-700 p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-300 transition">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{nidPhoto ? 'Photo Captured ✓' : 'Take Photo of NID'}</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={(e) => handlePhotoCapture('nid', e)}
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* 8. Beneficiary Photo */}
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">
            8. Beneficiary Photo (`beneficiary_photo`)
          </label>
          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer bg-emerald-950 hover:bg-emerald-900 border border-dashed border-emerald-700 p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-300 transition">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{beneficiaryPhoto ? 'Photo Captured ✓' : 'Take Beneficiary Photo'}</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="user"
                onChange={(e) => handlePhotoCapture('beneficiary', e)}
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* 9. Field Notes & Observations */}
        <div>
          <label className="block text-xs font-semibold text-emerald-200 mb-1">
            9. Field Notes & Observations (`summary`)
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Field observations, vulnerability criteria, or comments..."
            className="w-full bg-emerald-950 border border-emerald-700 text-white text-xs rounded-xl p-3 focus:border-emerald-400 outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99]"
        >
          <Save className="w-4 h-4" /> 
          {isSubmitting ? 'Saving to Offline Queue...' : 'Save Beneficiary Form to Queue'}
        </button>
      </form>
    </div>
  );
}
