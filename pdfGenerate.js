const AWS = require('aws-sdk');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { S3 } = require('@aws-sdk/client-s3');
const path = require('path');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-south-1'
});

const s3 = new S3({ region: 'ap-south-1' });

async function uploadToS3(filePath, bucketName) {
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileContent,
    ContentType: 'application/pdf',
    ACL: 'public-read' // Add this line
  };

  try {
    const data = await s3.putObject(params);
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (err) {
    console.error("Error uploading to S3: ", err);
    throw err;
  }
}

async function createPdf(name, date, email, phone) {
    
  // ... existing PDF creation logic ...
  
  // Handle the 'finish' event of the write stream
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
       // Register the BrushScriptStd font
       let date_str=Number(date);
       const date_format = new Date(date_str);
       // console.log(date_format)
       const formattedDate = date_format.toLocaleDateString('en-US', {
         day: '2-digit',
         month: 'short',
         year: 'numeric',
       }).toUpperCase();

     const outputPath = './output.pdf'; // Define output file path
     // First, convert hex color to RGB
  
 
     const stream = fs.createWriteStream(outputPath);
     doc.pipe(stream);
      // Add the logo at the top, scaled to full page width or the max height
      doc.image('./public/assets/img/cover.png', 0, 0, { width: doc.page.width });

     doc.moveDown(8);
     doc.fontSize(16).font('Helvetica-Bold').text('Investment and Trading Services Agreement', { align: 'center',color:'#004'});
     doc.moveDown();

     doc.fontSize(12).font('Helvetica').text('This Investment and Trading Services Agreement (the "Agreement") is entered into between Fujtrade, an initiative of Fujtown Trading LLC, hereinafter referred to as the "Company," and the undersigned client, hereinafter referred to as the "Client."', { align: 'justify', });
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('1. Investment Authorization:');
     doc.fontSize(12).font('Helvetica').text('By entering into this Agreement, the Client authorizes the Company to manage, invest, and trade funds on their behalf via e-trading.',);
     doc.moveDown();
   
     doc.fontSize(14).font('Helvetica-Bold').text('2. Investment Strategy:');
     doc.fontSize(12).font('Helvetica').text('The Company will employ its best efforts to manage the Client\'s funds in accordance with the investment strategy agreed upon.',);
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('3. Risks and Disclosures:');
     doc.fontSize(12).font('Helvetica').text('The Client acknowledges that all investments involve risks, and past performance is not indicative of future results. The Client agrees to bear all risks associated with the investment.',);
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('4. Fees and Charges:');
     doc.fontSize(12).font('Helvetica').text('The Client agrees to pay the Company fees as outlined in a separate fee schedule provided by the Company. Any changes to the fee structure will be communicated to the Client in advance.',);
     
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('5. Account Information:');
     doc.fontSize(12).font('Helvetica').text('The Client is responsible for providing accurate and up-to-date information for the establishment and maintenance of the investment account.',);
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('6. Withdrawals:');
     doc.fontSize(12).font('Helvetica').text('The Client may request withdrawals subject to the terms and conditions outlined in the Company\'s withdrawal policy, refunds are indicative in the case that the funds invested has not yet been utilized.',);
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('7. Confidentiality:');
     doc.fontSize(12).font('Helvetica').text('Both parties agree to keep confidential all non-public information obtained during the term of this Agreement.',);
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('8. Termination:');
     doc.fontSize(12).font('Helvetica').text('    Either party may terminate this Agreement with written notice. Termination does not affect any obligations arising before the termination date. The client does not have the right to request for the capital investment made if the investment is at a loss. Only profits will be transferred to the client if applicable.',);
     doc.moveDown();
     doc.fontSize(14).font('Helvetica-Bold').text('9. Governing Law:');
     doc.fontSize(12).font('Helvetica').text('This Agreement shall be governed by and construed in accordance with the laws of the UAE.',);
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('10. Dispute Resolution:');
     doc.fontSize(12).font('Helvetica').text('Any disputes arising out of or in connection with this Agreement shall be resolved through arbitration in accordance with the rules of the UAE.',);
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('11. Amendments:');
     doc.fontSize(12).font('Helvetica').text('This Agreement is not amendable, and can only be terminated upon the given terms.',);
    
     doc.moveDown();

     doc.fontSize(14).font('Helvetica-Bold').text('12. Entire Agreement: ');
     doc.fontSize(12).font('Helvetica').text('This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements, oral or written, relating to the subject matter herein.',);
     doc.moveDown();
     doc.fontSize(14).font('Helvetica-Bold').text('13. Acceptance of Agreement: ');
     doc.fontSize(12).font('Helvetica').text('This Agreement is considered accepted by the client upon checking the tick box of the terms and conditions on the website, and upon initiating the first investment funds transfer.',);
     doc.moveDown();
     doc.fontSize(14).font('Helvetica-Bold').text('14. Acceptance of Secure 3DS Transaction: ');
     doc.fontSize(12).font('Helvetica').text('This confirms that the Client has accepted that all transactions are made via secure 3DS payment processor, and that in the case that the Client does not have 3DS enabled upon making the payment, the transaction shall not be accepted. This is to ensure that the payments received are of clean origin and non-fraudulent. This is also to ensure that the Client is willing upon himself/herself to make the payment for the service requested, without any objection, on their own will in order to profit from the service provided. ',);
     doc.moveDown();
     doc.fontSize(14).font('Helvetica-Bold').text('15. Profit & Loss Liability:');
     doc.fontSize(12).font('Helvetica').text('This Agreement is considered accepted by the client upon checking the tick box of the terms and conditions on the website, and upon initiating the first investment funds transfer.',);
    
     doc.addPage();
     // Start with normal font
         doc.fontSize(16);

         // Make 'IN WITNESS WHEREOF' bold
         doc.font('Helvetica-Bold').text('IN WITNESS WHEREOF', {
           align: 'left',
           continued: true // Continue on the same line
         });

         // Continue with normal weight font
         doc.font('Helvetica').text('the parties hereto have executed this Investment and Trading Services Agreement as of the Effective Date.', {
           align: 'center',
         });

           
        doc.moveDown(2).fontSize(14)
        .text('Client\'s Name:  ', {
         continued: true,
         align: 'left',
         
        })
        doc.font('Helvetica-Bold').text('  '+ name, {
         align: 'left'
       });
       
       doc.font('Helvetica');    
        doc.moveDown(2).fontSize(14)
        .text('Client\'s Email:  ', {
         continued: true,
         align: 'left',
         
        })
        doc.font('Helvetica-Bold').text('  '+email, {
         align: 'left'
       });
       doc.font('Helvetica');

        doc.moveDown(2).fontSize(14)
        .text('Client\'s Phone #:  ', {
         continued: true,
         align: 'left',
         
        })
        doc.font('Helvetica-Bold').text('  '+phone, {
         align: 'left'
       });
     
       doc.font('Helvetica');
       // Reset the font for the rest of the document
        
       //  formattedDate
        doc.moveDown(2).fontSize(14).text('Date:  ', {
         continued: true,
         align: 'left',
       });
       
       doc.font('Helvetica-Bold').text('  '+formattedDate, {
         align: 'left'
       });
        
       doc.font('Helvetica');
       doc.moveDown(2);
       doc.fontSize(16).font('Helvetica-Bold').text('THIS AGREEMENT HAS BEEN ACCEPTED AND AGREED UPON BY CLIENT UPON ACCOUNT OPENING AND FUNDS TRANSFER',{
        align:'justify'
       });
       doc.font('Helvetica');
        doc.moveDown(5).fontSize(14)
        .text('Company Name:  ', {
            align: 'left',
            continued: true,
        });
        doc.fontSize(18).font('Helvetica-Bold').text('  FUJTOWN', {
          align: 'left'
        });
        doc.font('Helvetica');
     doc.moveDown(3).fontSize(14)
        .text('Company Representative\'s Signature:   ', {
            align: 'left',
        });
    doc.image('./public/assets/img/stamp-fujtown.png', 325, 545, {width: 180, height: 90})
    doc.font('Helvetica');
     doc.moveDown(4).fontSize(14)
        .text('Date:  ', {
            align: 'left',
            continued: true,
        });  
        doc.font('Helvetica-Bold').text('  '+formattedDate, {
          align: 'left',
        }); 

    stream.on('finish', async function() {
      const s3Url = await uploadToS3(outputPath, process.env.S3_BUCKET);
      resolve(s3Url);
    });

    stream.on('error', function(err) {
      reject(err);
    });

    doc.end();
  });
}

module.exports = createPdf;
