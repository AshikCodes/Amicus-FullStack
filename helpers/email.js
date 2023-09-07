require('dotenv').config()
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
})

const sendConfirmationEmail = (name, receiver, confirmationCode) => {
    try {
        transporter.sendMail({
            from: process.env.EMAIL,
            to: receiver,
            subject: 'Confirm Your Account - Amicus Law',
            html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
                    <p>Hello ${name},</p>
                    <p>Thank you for joining Amicus Law! Please confirm your account by clicking on the following link:</p>
                    <p style="margin: 24px 0;"><a href="http://localhost:3000/confirm/${confirmationCode}" style="background-color: #4CAF50; color: #ffffff; padding: 12px 24px; text-decoration: none;">Confirm My Account</a></p>
                    <p>If you did not sign up for this account, please disregard this email.</p>
                    <p>Best regards,</p>
                    <p>The Amicus Law Team</p>
                  </div>`
        });
        console.log('Sent email!')
        }
        catch(err){
            console.log(`Error sending email: ${err}`)
        }
    }
    
    // const sendQuoteRequestEmail = (sender, quoteDetails) => {
    //     console.log(`process.env here is ${process.env.EMAIL}`)
    //     try {
    //         transporter.sendMail({
    //             from: process.env.EMAIL,
    //             to: 'icannotmiss7@gmail.com', // Replace with the recipient email address
    //             subject: 'Exciting News! New Custom Plan Quote Request 🚀',
    //             html: `
    //             <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
    //                 <div style="text-align: center; background-color: #f2f2f2; padding: 20px;">
    //                     <h2 style="color: #004AAD;">Exciting News! New Custom Plan Quote Request 🚀</h2>
    //                 </div>
    //                 <div style="padding: 20px;">
    //                     <p>Dear Admin,</p>
    //                     <p>We're excited to share that a new quote request has landed in our inbox through the Custom Plan inquiry form. Here are the comprehensive details for your perusal:</p>
    //                     <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; background-color: #f9f9f9;">
    //                         <h3>Quote Details:</h3>
    //                         ${quoteDetails}
    //                     </div>
    //                     <p>This quote request was sent by: <a href="mailto:${sender}" style="color: #004AAD;">${sender}</a></p>
    //                     <p>Please take the time to review these details and strategize a tailored quote that aligns with the client's needs. Feel free to reach out to the client directly for any clarifications you may require.</p>
    //                     <p>Best regards,<br>The Amicus Law Team</p>
    //                 </div>
    //             </div>
    //             `
    //         });
    //         console.log('Sent email!');
    //     } catch (err) {
    //         console.log(`Error sending email: ${err}`);
    //     }
    // };
    const sendQuoteRequestEmail = (sender, quoteDetails) => {
        try {
            transporter.sendMail({
                from: process.env.EMAIL,
                to: 'icannotmiss7@gmail.com', // Replace with the recipient email address
                subject: 'Exciting News! New Custom Plan Quote Request 🚀',
                html: `
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Arial, sans-serif;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #ffffff;
                            border-radius: 5px;
                            box-shadow: 0px 3px 5px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 20px;
                            color: #5623B7;
                        }
                        .quote-details {
                            margin-bottom: 20px;
                            padding: 15px;
                            border: 1px solid #ccc;
                            border-radius: 5px;
                            background-color: #f9f9f9;
                        }
                        .sender-info {
                            margin-top: 20px;
                            font-size: 14px;
                            color: #666;
                        }
                        .sender-link {
                            color: #5623B7;
                            text-decoration: none;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>Exciting News! New Custom Plan Quote Request 🚀</h2>
                        </div>
                        <p>Dear Admin,</p>
                        <p>We're thrilled to share that a new quote request has landed in our inbox through the Custom Plan inquiry form. Here are the comprehensive details for your review:</p>
                        <div class="quote-details">
                            <h3>Quote Details:</h3>
                            ${quoteDetails}
                        </div>
                        <div class="sender-info">
                            <p>This quote request was sent by: <a href="mailto:${sender}" class="sender-link">${sender}</a></p>
                        </div>
                        <p>Please take the time to review these details and strategize a tailored quote that aligns with the client's needs. Feel free to reach out to the client directly for any clarifications you may require.</p>
                        <p>When responding, kindly use the client's email address to discuss the quote details and pricing.</p>
                        <p>Best regards,<br>The Amicus Law Team</p>
                    </div>
                </body>
                </html>
                `
            });
            console.log('Sent email!');
        } catch (err) {
            console.log(`Error sending email: ${err}`);
        }
    };

    const sendCustomPlanReadyEmail = (clientEmail, clientName, casePin, planInfo, planAmount) => {
        try {
            transporter.sendMail({
                from: process.env.EMAIL,
                to: clientEmail,
                subject: 'Your Custom Legal Plan is Ready! 🚀',
                html: `
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Arial, sans-serif;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #ffffff;
                            border-radius: 5px;
                            box-shadow: 0px 3px 5px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 20px;
                            color: #5623B7;
                        }
                        .details {
                            margin-top: 20px;
                            font-size: 16px;
                            color: #333;
                        }
                        .steps {
                            margin-top: 20px;
                            font-size: 14px;
                            color: #666;
                        }
                        .steps ol {
                            margin-left: 20px;
                        }
                        .steps li {
                            margin-bottom: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>Your Custom Legal Plan is Ready! 🚀</h2>
                        </div>
                        <p>Dear ${clientName},</p>
                        <p>Exciting news! Your personalized Custom Legal Plan has been crafted by our expert legal team and is now ready for your review and approval.</p>
                        <div class="details">
                            <p><strong>Plan Details:</strong></p>
                            <p><strong>Case PIN:</strong> ${casePin}</p>
                            <p><strong>Description:</strong> ${planInfo}</p>
                            <p><strong>Price:</strong>$${planAmount}</p>
                        </div>
                        <div class="steps">
                            <p>To proceed with your Custom Legal Plan, please follow these steps:</p>
                            <ol>
                                <li>Create a new Case Brief from your client dashboard.</li>
                                <li>Select 'Custom Plan' as your preferred plan type.</li>
                                <li>Enter the provided Case PIN during the setup process.</li>
                                <li>Submit your case brief and pay the advance fee.</li>
                            </ol>
                        </div>
                        <p>If you have any questions or need assistance, feel free to reply to this email or reach out to our team at [Your Contact Email]. We're here to ensure your plan aligns perfectly with your legal needs.</p>
                        <p>Once you've completed the above steps, you'll be all set to unlock a world of tailored legal support!</p>
                        <p>Thank you for choosing Amicus Law. We're excited to be your trusted legal partner and look forward to assisting you on your legal journey.</p>
                        <p>Best regards,<br>The Amicus Law Team</p>
                    </div>
                </body>
                </html>
                `
            });
            console.log('Sent email!');
        } catch (err) {
            console.log(`Error sending email: ${err}`);
        }
    };
    // sendCompletedCaseEmail = (clientEmail, clientName, caseTitle, lawyerName)

    const sendCompletedCaseEmail = (clientEmail, clientName, caseTitle, lawyerName) => {
        try {
            transporter.sendMail({
                from: process.env.EMAIL,
                to: clientEmail,
                subject: 'Your Completed Case Assignment is Ready!',
                html: `
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Arial, sans-serif;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #ffffff;
                            border-radius: 5px;
                            box-shadow: 0px 3px 5px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 20px;
                            color: #5623B7;
                        }
                        .details {
                            margin-top: 20px;
                            font-size: 16px;
                            color: #333;
                        }
                        .next-steps {
                            margin-top: 20px;
                            font-size: 14px;
                            color: #666;
                        }
                        .next-steps ol {
                            margin-left: 20px;
                        }
                        .next-steps li {
                            margin-bottom: 10px;
                        }
                        .cta-button {
                            display: block;
                            width: 200px;
                            margin: 20px auto;
                            background-color: #5623B7;
                            color: #ffffff;
                            text-align: center;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 5px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>Your Completed Case Assignment is Ready!</h2>
                        </div>
                        <p>Dear ${clientName},</p>
                        <p>We're delighted to inform you that your recently assigned case has been meticulously handled and is now ready for your review.</p>
                        <div class="details">
                            <p><strong>Case Assignment Details:</strong></p>
                            <p><strong>Case Title:</strong> ${caseTitle}</p>
                            <p><strong>Assigned Lawyer:</strong> ${lawyerName}</p>
                        </div>
                        <div class="next-steps">
                            <p><strong>Next Steps:</strong></p>
                            <ol>
                                <li><strong>Review Your Case:</strong> Take the time to thoroughly review the completed assignment. Ensure that it aligns with your expectations and legal needs.</li>
                                <li><strong>Billing Information:</strong> You'll find the final fee for this case posted in the billing section of your client dashboard. Please proceed with the payment to finalize the case.</li>
                                <li><strong>Feedback:</strong> We value your feedback! If you have any comments, questions, or require further assistance, don't hesitate to reach out to our team. Your input helps us continually improve our services.</li>
                            </ol>
                        </div>
                        <p>Thank you for entrusting us with your legal needs. We're here to provide you with exceptional legal support every step of the way.</p>
                        <p>Should you have any queries or need additional assistance, feel free to contact us at [Your Contact Email].</p>
                        <p>Best regards,<br>The Amicus Law Team</p>
                    </div>
                </body>
                </html>
                `
            });
            console.log('Sent email!');
        } catch (err) {
            console.log(`Error sending email: ${err}`);
        }
    };
    
    
    
    
    

module.exports = { sendQuoteRequestEmail, sendCustomPlanReadyEmail, sendCompletedCaseEmail };