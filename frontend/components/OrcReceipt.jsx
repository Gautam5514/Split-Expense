import React, { useMemo } from 'react';

// Helper component for a consistent section layout
const Section = ({ title, children, className = "" }) => (
    <div className={mb - 6 ${className}}>
        { title && (
            <h3 className="text-emerald-400 text-sm font-semibold mb-3 uppercase tracking-wider border-b border-gray-700 pb-2">
                {title}
            </h3>
        )}
<div className="text-gray-300 leading-relaxed text-sm font-mono">
    {children}
</div>
  </div >
);

// This component intelligently parses and formats the OCR text
export default function OcrReceipt({ text }) {

    // useMemo ensures this complex parsing logic only runs when the text changes
    const parsedData = useMemo(() => {
        if (!text?.trim()) return null;

        const lines = text.split('\n').filter(line => line.trim() !== '');

        const data = {
            seller: {},
            buyer: { name: [], address: [] },
            invoice: {},
            items: [],
            totals: {},
            payment: {},
            transport: {},
            words: {}
        };

        // More robust Regex patterns to capture data
        const itemRegex = /^(\d+)\s*[|\[]?\s*(.*?)\s+(?:\d+)\s+(?:NOS|PCS|QTY)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/;
        const gstinRegex = /GSTIN\s*[:\s]+(\w{15})/;
        const panRegex = /PAN\s*[:\s]+(\w{10})/;
        const invoiceDateRegex = /invoice Date\s+([\w-]+)/i;
        const invoiceNumRegex = /(?:invoice|gst)\s+([\w-]+)/i;
        const billToRegex = /m\/s (.*)/i;
        const igstRegex = /IGST\s*\((\d+\.\d{2})\s*%\)\s*([\d,]+\.\d{2})/;
        const totalInWordsRegex = /Total in words.?:\s(.*)/i;
        const taxInWordsRegex = /Total Tax in words.?:\s(.*)/i;
        const accNumRegex = /Acc(?:ount|\.)? Number\s*[:\s]+(\w+)/i;
        const ifscRegex = /IFSC\s*[:\s]+(\w+)/i;
        const upiRegex = /UPI ID\s*[:\s]+(\S+)/i;


        let isParsingBuyer = false;

        lines.forEach(line => {
            // Items
            const itemMatch = line.match(itemRegex);
            if (itemMatch) {
                isParsingBuyer = false; // Stop parsing buyer info when items start
                data.items.push({
                    description: itemMatch[2].trim(),
                    qty: 1, // Defaulting to 1 as per sample
                    rate: parseFloat(itemMatch[3].replace(/,/g, '')),
                    amount: parseFloat(itemMatch[4].replace(/,/g, '')),
                });
                return;
            }

            // Stop parsing buyer address if we hit a clear separator or new section
            if (line.includes('---') || line.toLowerCase().includes('supply')) {
                isParsingBuyer = false;
            }

            // Buyer Info
            const billToMatch = line.match(billToRegex);
            if (billToMatch) {
                isParsingBuyer = true;
                data.buyer.name.push(billToMatch[1].split('Challan')[0].trim()); // Clean up extra text
                return;
            }
            if (isParsingBuyer && line.toLowerCase().includes('address')) {
                data.buyer.address.push(line.split('Address')[1].trim());
                return;
            }
            if (isParsingBuyer && data.buyer.address.length > 0) {
                data.buyer.address.push(line.split('E-Way')[0].trim()); // Clean up extra text
                return;
            }

            // Invoice Info
            const gstinMatch = line.match(gstinRegex);
            if (gstinMatch) data.invoice.gstin = gstinMatch[1];

            const panMatch = line.match(panRegex);
            if (panMatch) data.seller.pan = panMatch[1];

            const invoiceDateMatch = line.match(invoiceDateRegex);
            if (invoiceDateMatch) data.invoice.date = invoiceDateMatch[1];

            const invoiceNumMatch = line.match(invoiceNumRegex);
            if (invoiceNumMatch && !data.invoice.number) data.invoice.number = invoiceNumMatch[1];

            // Totals
            const igstMatch = line.match(igstRegex);
            if (igstMatch) {
                data.totals.igst = {
                    percentage: igstMatch[1],
                    amount: parseFloat(igstMatch[2].replace(/,/g, '')),
                };
            }

            // Payment Details
            const accNumMatch = line.match(accNumRegex);
            if (accNumMatch) data.payment.accNumber = accNumMatch[1];

            const ifscMatch = line.match(ifscRegex);
            if (ifscMatch) data.payment.ifsc = ifscMatch[1];

            const upiMatch = line.match(upiRegex);
            if (upiMatch) data.payment.upi = upiMatch[1];

            // Amounts in Words
            const totalWordsMatch = line.match(totalInWordsRegex);
            if (totalWordsMatch) data.words.total = totalWordsMatch[1];

            const taxWordsMatch = line.match(taxInWordsRegex);
            if (taxWordsMatch) data.words.tax = taxWordsMatch[1];
        });

        // Final Calculations
        data.totals.subtotal = data.items.reduce((acc, item) => acc + item.amount, 0);
        data.totals.finalTotal = data.totals.subtotal + (data.totals.igst?.amount || 0);

        return data;

    }, [text]);

    if (!parsedData) {
        return <p className="text-gray-400 font-mono">No parsable OCR text available.</p>;
    }

    const { seller, buyer, invoice, items, totals, payment, words } = parsedData;

    return (
        <div>
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 className="font-bold text-lg text-white mb-2">LOGO TEXT</h3>
                    {/* This part can be made dynamic if seller info is in OCR */}
                    <p>Manufacturing & Supply of Precision Tools</p>
                    <p>Waghle Industrial Estate, Mumbai, 400604</p>
                    {seller.pan && <p><strong>PAN:</strong> {seller.pan}</p>}
                </div>
                <div className="text-left md:text-right">
                    <h2 className="font-bold text-2xl text-white uppercase tracking-wider mb-2">Tax Invoice</h2>
                    <p><strong>Invoice #:</strong> {invoice.number || 'N/A'}</p>
                    <p><strong>Date:</strong> {invoice.date || 'N/A'}</p>
                    <p><strong>GSTIN:</strong> {invoice.gstin || 'N/A'}</p>
                </div>
            </div>

            {buyer.name.length > 0 && (
                <Section title="Billed To">
                    <p className="font-semibold text-white">{buyer.name.join(' ')}</p>
                    {buyer.address.map((line, i) => <p key={i}>{line}</p>)}
                </Section>
            )}

            <Section title="Items">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-600">
                            <th className="py-2 font-semibold">Description</th>
                            <th className="text-right font-semibold">Rate</th>
                            <th className="text-right font-semibold">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-800">
                                <td className="py-2 pr-2">{item.description}</td>
                                <td className="text-right">{item.rate.toFixed(2)}</td>
                                <td className="text-right">{item.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            {/* Summary Section */}
            <div className="flex justify-end mt-6">
                <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Subtotal:</span>
                        <span className="text-white">{totals.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    {totals.igst && (
                        <div className="flex justify-between">
                            <span className="text-gray-400">IGST ({totals.igst.percentage}%):</span>
                            <span className="text-white">{totals.igst.amount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-white text-base border-t-2 border-gray-600 pt-2 mt-2">
                        <span>Total:</span>
                        <span>₹{totals.finalTotal?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
            </div>

            {Object.keys(payment).length > 0 && (
                <Section title="Payment Details" className="mt-6">
                    {payment.accNumber && <p><strong>Account Number:</strong> {payment.accNumber}</p>}
                    {payment.ifsc && <p><strong>IFSC Code:</strong> {payment.ifsc}</p>}
                    {payment.upi && <p><strong>UPI ID:</strong> {payment.upi}</p>}
                </Section>
            )}
        </div>
    );
}