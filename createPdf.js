const PDFDocument = require('pdfkit');
const fs = require('fs');

function createPdf() {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream('InvestmentAndTradingServicesAgreement.pdf'));

        doc.fontSize(12)
           .text('IN WITNESS WHEREOF, the parties hereto have executed this Investment and Trading Services Agreement as of the Effective Date.', {
               align: 'justify'
           });
    
        doc.moveDown()
           .text('Client\'s Name: ___________________________________', {
               continued: false
           })
           .text('Client\'s Signature: _______________________________', {
               align: 'right'
           });
    
        doc.moveDown()
           .text('Date: _______________', {
               continued: true
           })
           .text('Company Name: ________________________', {
               align: 'right'
           });
    
        doc.moveDown()
           .text('Company Representative\'s Signature: ________________________', {
               align: 'left'
           });
    
        doc.moveDown()
           .text('Date: ________________________', {
               align: 'left'
           });
    
        doc.end();

        doc.on('finish', () => {
            resolve(fileName);
        });

        doc.on('error', reject);
    });
}

module.exports = createPdf;
