import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AllPlayersPage.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://localhost:3001/api';

function formatCr(v) { 
  if (v === null || v === undefined) return '-';
  return '₹' + Number(v).toFixed(2) + ' Cr'; 
}

export default function AllPlayersPage() {
  const nav = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.text('IPL Auction 2026 - Full Player Catalog', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 30);

      const tableColumn = ["ID", "Player Name", "Role", "Country", "Base Price", "Status", "Sold Price", "Team"];
      const tableRows = [];

      players.forEach(p => {
        const tablePrice = p.sold_price ? `₹${Number(p.sold_price).toFixed(2)} Cr` : '-';
        const playerData = [
          `#${p.id}`,
          p.name,
          p.role,
          p.country,
          `₹${Number(p.base_price).toFixed(2)} Cr`,
          p.status.toUpperCase(),
          tablePrice,
          p.sold_to || '-'
        ];
        tableRows.push(playerData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`IPL_Players_List_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`${API_BASE}/players`);
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        setPlayers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const filtered = players.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  return (
    <div className={styles.app + ' fade-up'}>
      <header className={styles.header}>
        <div className={styles.title}>
          <h1>Full Player Database</h1>
          <p>Explore the complete auction catalog of {players.length} registered players.</p>
        </div>
        
        <div className={styles.controls}>
          <button 
            className={styles.pdfButton} 
            onClick={downloadPDF}
            disabled={players.length === 0}
          >
            📥 Download Player List (PDF)
          </button>

          <select 
            className={styles.filterSelect}
            value={filter} 
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All Players ({players.length})</option>
            <option value="pending">Upcoming / Pending</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: '#64748b', fontSize: '1.2rem' }}>
          <span className="pulse-dot" style={{ display: 'inline-block', marginRight: '10px' }}></span>
          Loading player database...
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Player Name</th>
                <th>Role</th>
                <th>Country</th>
                <th>Base Price</th>
                <th>Auction Status</th>
                <th style={{ textAlign: 'right' }}>Final Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className={styles.idCell}>#{p.id}</td>
                  <td className={styles.nameCell}>{p.name}</td>
                  <td><span className={styles.rolePill}>{p.role}</span></td>
                  <td>{p.country}</td>
                  <td className={styles.priceCell}>{formatCr(p.base_price)}</td>
                  <td>
                    {p.status === 'pending' && <span className={`${styles.statusBadge} ${styles.pending}`}>🟡 Pending</span>}
                    {p.status === 'sold' && <span className={`${styles.statusBadge} ${styles.sold}`}>🟢 Sold</span>}
                    {p.status === 'unsold' && <span className={`${styles.statusBadge} ${styles.unsold}`}>🔴 Unsold</span>}
                  </td>
                  <td className={styles.resultCell} style={{ textAlign: 'right' }}>
                    {p.status === 'sold' ? (
                      <span className={styles.soldTo}>Sold to {p.sold_to} for {formatCr(p.sold_price)}</span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>No players found in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
