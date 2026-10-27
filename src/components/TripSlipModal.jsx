import React from 'react';
import { Printer, Share2, X, CheckCircle, Clock } from 'lucide-react';
import { translations } from '../translations/dictionary';
import { formatDateDDMMYYYY, formatTimeDisplay } from '../utils/dateUtils';
import { 
  healShiftedTripRecord, 
  localizeName, 
  localizeMachineryName, 
  localizeWorkType, 
  localizePaymentMode, 
  localizeCollectedBy 
} from '../utils/langUtils';

export default function TripSlipModal({ isOpen, onClose, trip: rawTrip, lang, settings }) {
  if (!isOpen || !rawTrip) return null;
  const trip = healShiftedTripRecord(rawTrip);
  const t = translations[lang] || translations.en;

  const dispCustomer = lang === 'ta'
    ? (trip.customerName_ta || localizeName(trip.customerName, 'ta'))
    : (localizeName(trip.customerName_ta || trip.customerName, 'en'));

  const dispDriver = lang === 'ta'
    ? (trip.driverName_ta || localizeName(trip.driverName, 'ta'))
    : (localizeName(trip.driverName_ta || trip.driverName, 'en'));

  const dispTractor = lang === 'ta'
    ? (trip.tractorName_ta || localizeMachineryName(trip.tractorName, 'ta'))
    : (localizeMachineryName(trip.tractorName_ta || trip.tractorName, 'en'));

  const dispImplement = trip.implementName 
    ? (lang === 'ta' ? (trip.implementName_ta || localizeMachineryName(trip.implementName, 'ta')) : localizeMachineryName(trip.implementName_ta || trip.implementName, 'en'))
    : (lang === 'ta' ? 'தனி டிராக்டர்' : 'Standalone Tractor');

  const dispWork = localizeWorkType(trip.workType || trip.workDescription, lang);
  const dispMode = localizePaymentMode(trip.paymentMode, lang);
  const dispCollector = localizeCollectedBy(trip.collectedBy, lang);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const startT = formatTimeDisplay(trip.startTime);
    const endT = formatTimeDisplay(trip.endTime);
    const timeSnippet = startT ? ` (${startT}${endT ? ` - ${endT}` : ''})` : '';
    const company = lang === 'ta' ? (settings.companyName_ta || settings.companyName) : settings.companyName;
    const text = `🚜 *${company || 'TRACTOR BILL SLIP'}* 🚜
==============================
*${lang === 'ta' ? 'ரசீது எண்' : 'Trip Slip No'}:* ${trip.id}
*${lang === 'ta' ? 'தேதி' : 'Date'}:* ${formatDateDDMMYYYY(trip.date)}${timeSnippet}
*${lang === 'ta' ? 'வாடிக்கையாளர்' : 'Customer'}:* ${dispCustomer}
*${lang === 'ta' ? 'ஓட்டுநர்' : 'Driver'}:* ${dispDriver}
*${lang === 'ta' ? 'டிராக்டர்' : 'Tractor'}:* ${dispTractor}
*${lang === 'ta' ? 'கருவி' : 'Implement'}:* ${dispImplement}
*${lang === 'ta' ? 'வேலை விவரம்' : 'Work Done'}:* ${dispWork}
------------------------------
*${lang === 'ta' ? 'அளவு' : 'Units'}:* ${trip.quantity} ${trip.billingUnit}
*${lang === 'ta' ? 'கட்டணம்' : 'Rate'}:* ₹${trip.rate}
*${lang === 'ta' ? 'மொத்த தொகை' : 'Gross Total'}:* ₹${trip.grossAmount}
${trip.discount ? `*${lang === 'ta' ? 'தள்ளுபடி' : 'Discount'}:* ₹${trip.discount}\n` : ''}*${lang === 'ta' ? 'நிகர தொகை' : 'Net Total'}:* ₹${trip.totalAmount}
*${lang === 'ta' ? 'செலுத்தியது' : 'Amount Paid'}:* ₹${trip.paidAmount} (${dispMode})
*${lang === 'ta' ? 'நிலுவை' : 'Balance Due'}:* ₹${trip.balanceAmount}
------------------------------
*${lang === 'ta' ? 'கட்டண நிலை' : 'Status'}:* ${trip.paymentStatus?.toUpperCase()}
${trip.collectedBy ? `*${lang === 'ta' ? 'வசூலித்தவர்' : 'Collected By'}:* ${dispCollector} on ${trip.collectedWhen}\n` : ''}${lang === 'ta' ? 'நன்றி! மீண்டும் வருக! 🙏' : 'Thank you for your business! 🙏'}`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{t.printSlip}</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}>
            <X size={16} />
            <span>{t.cancel || 'Close'}</span>
          </button>
        </div>

        <div className="modal-body">
          {/* Printable Slip Area */}
          <div className="printable-slip-wrapper">
            <div className="slip-header">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <img 
                  src="/logo.png" 
                  alt="TractoMint" 
                  style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} 
                />
              </div>
              <div className="slip-company-name">
                {lang === 'ta' ? (settings.companyName_ta || settings.companyName) : settings.companyName}
              </div>
              <div className="slip-company-sub">
                {settings.address} | Ph: {settings.contactPhone}
              </div>
              <div className="slip-badge-pill">
                TRACTOR & IMPLEMENT WORK SLIP / உழவு ரசீது
              </div>
            </div>

            <table className="slip-table">
              <tbody>
                <tr>
                  <td className="slip-label">{t.tripId}:</td>
                  <td className="slip-value" style={{ color: 'var(--primary-700)', fontSize: '1rem' }}>{trip.id}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.tripDate}:</td>
                  <td className="slip-value">
                    {formatDateDDMMYYYY(trip.date)} {formatTimeDisplay(trip.startTime) ? `(${formatTimeDisplay(trip.startTime)} - ${formatTimeDisplay(trip.endTime) || '--'})` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="slip-label">{t.customerName}:</td>
                  <td className="slip-value" style={{ fontWeight: 700 }}>{dispCustomer}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.driverName}:</td>
                  <td className="slip-value">{dispDriver}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.tractor}:</td>
                  <td className="slip-value">{dispTractor}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.machine}:</td>
                  <td className="slip-value">{dispImplement}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.workDescription}:</td>
                  <td className="slip-value">{dispWork}</td>
                </tr>
                {trip.startMeter && trip.endMeter && (
                  <tr>
                    <td className="slip-label">Hour Meter Reading:</td>
                    <td className="slip-value">{trip.startMeter} - {trip.endMeter} ({trip.quantity} Hrs)</td>
                  </tr>
                )}
                <tr>
                  <td className="slip-label">{t.workedUnits}:</td>
                  <td className="slip-value">{trip.quantity} ({trip.billingUnit})</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.rateAmount}:</td>
                  <td className="slip-value">₹{trip.rate}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.grossAmount}:</td>
                  <td className="slip-value">₹{trip.grossAmount}</td>
                </tr>
                {trip.discount > 0 && (
                  <tr>
                    <td className="slip-label">{t.discount}:</td>
                    <td className="slip-value" style={{ color: '#16a34a' }}>- ₹{trip.discount}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Total Highlight Box */}
            <div className="slip-total-box">
              <span>{t.totalAmount}:</span>
              <span>₹{trip.totalAmount}</span>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#4b5563', fontSize: '0.85rem' }}>{t.paidAmount}:</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>₹{trip.paidAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#4b5563', fontSize: '0.85rem' }}>{t.balanceAmount}:</span>
                <span style={{ fontWeight: 700, color: trip.balanceAmount > 0 ? '#dc2626' : '#16a34a' }}>
                  ₹{trip.balanceAmount}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                <span>{t.collectedBy}: {trip.collectedBy || '--'} ({trip.paymentMode?.toUpperCase()})</span>
                <span>{trip.collectedWhen || ''}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af' }}>
              Computer generated billing record • TractoMint Agri Fleet Management
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn btn-outline" onClick={onClose}>
            {t.close}
          </button>
          <button className="btn btn-whatsapp" onClick={handleWhatsAppShare}>
            <Share2 size={16} />
            {t.shareWhatsapp}
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            {t.printSlip}
          </button>
        </div>
      </div>
    </div>
  );
}
