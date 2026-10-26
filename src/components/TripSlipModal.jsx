import React from 'react';
import { Printer, Share2, X, CheckCircle, Clock } from 'lucide-react';
import { translations } from '../translations/dictionary';
import { formatDateDDMMYYYY, formatTimeDisplay } from '../utils/dateUtils';

export default function TripSlipModal({ isOpen, onClose, trip, lang, settings }) {
  if (!isOpen || !trip) return null;
  const t = translations[lang];

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const startT = formatTimeDisplay(trip.startTime);
    const endT = formatTimeDisplay(trip.endTime);
    const timeSnippet = startT ? ` (${startT}${endT ? ` - ${endT}` : ''})` : '';
    const text = `🚜 *${settings.companyName || 'TRACTOR BILL SLIP'}* 🚜
==============================
*Trip Slip No:* ${trip.id}
*Date:* ${formatDateDDMMYYYY(trip.date)}${timeSnippet}
*Customer:* ${trip.customerName}
*Driver:* ${trip.driverName}
*Tractor:* ${trip.tractorName}
*Implement:* ${trip.implementName || 'Standalone'}
*Work Done:* ${trip.workType || trip.workDescription}
------------------------------
*Units / Hours:* ${trip.quantity} ${trip.billingUnit}
*Rate:* ₹${trip.rate}
*Gross Total:* ₹${trip.grossAmount}
${trip.discount ? `*Discount:* ₹${trip.discount}\n` : ''}*Net Total Amount:* ₹${trip.totalAmount}
*Amount Paid:* ₹${trip.paidAmount} (${trip.paymentMode?.toUpperCase()})
*Balance Due:* ₹${trip.balanceAmount}
------------------------------
*Status:* ${trip.paymentStatus?.toUpperCase()}
${trip.collectedBy ? `*Collected By:* ${trip.collectedBy} on ${trip.collectedWhen}\n` : ''}Thank you for your business! 🙏`;

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
                  <td className="slip-value" style={{ fontWeight: 700 }}>{trip.customerName}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.driverName}:</td>
                  <td className="slip-value">{trip.driverName}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.tractor}:</td>
                  <td className="slip-value">{trip.tractorName}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.machine}:</td>
                  <td className="slip-value">{trip.implementName || 'Direct'}</td>
                </tr>
                <tr>
                  <td className="slip-label">{t.workDescription}:</td>
                  <td className="slip-value">{trip.workDescription || trip.workType}</td>
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
