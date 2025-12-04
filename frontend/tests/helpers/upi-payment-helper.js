class UPIPaymentHelper {
  constructor(page) {
    this.page = page;
    this.paymentProviders = [
      { name: 'GPay', upiPattern: '@okaxis', icon: 'gpay' },
      { name: 'PhonePe', upiPattern: '@ybl', icon: 'phonepe' },
      { name: 'Paytm', upiPattern: '@paytm', icon: 'paytm' },
      { name: 'BHIM', upiPattern: '@upi', icon: 'bhim' }
    ];
  }

  generateUPIId(provider = 'GPay') {
    const selectedProvider = this.paymentProviders.find(p => p.name === provider) || this.paymentProviders[0];
    const randomNumber = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `user${randomNumber}${selectedProvider.upiPattern}`;
  }

  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `TXN${timestamp}${random}`.toUpperCase();
  }

  async selectUPIMethod(provider = 'GPay') {
    console.log(`💳 Selecting UPI provider: ${provider}`);

    const upiOptions = await this.page.$$('input[value="upi"], label:has-text("UPI"), button:has-text("UPI")');
    if (upiOptions.length > 0) {
      await upiOptions[0].click();
      await this.page.waitForTimeout(1000);
    }

    const providerButton = await this.page.$(`button:has-text("${provider}"), label:has-text("${provider}")`);
    if (providerButton) {
      await providerButton.click();
      await this.page.waitForTimeout(500);
    }

    return true;
  }

  async fillUPIDetails(upiId = null, amount = null) {
    const generatedUpiId = upiId || this.generateUPIId();

    const upiInput = await this.page.waitForSelector(
      'input[placeholder*="UPI"], input[name="upi"], input[placeholder*="@"], input[placeholder*="VPA"]',
      { timeout: 5000 }
    ).catch(() => null);

    if (upiInput) {
      await upiInput.click({ clickCount: 3 });
      await upiInput.type(generatedUpiId, { delay: 50 });
      console.log(`📝 Entered UPI ID: ${generatedUpiId}`);
    }

    if (amount) {
      const amountInput = await this.page.$('input[name="amount"], input[placeholder*="Amount"], input[type="number"][placeholder*="₹"]');
      if (amountInput) {
        await amountInput.click({ clickCount: 3 });
        await amountInput.type(amount.toString(), { delay: 50 });
        console.log(`💰 Entered amount: ₹${amount}`);
      }
    }

    const pinInput = await this.page.$('input[type="password"][placeholder*="PIN"], input[name="upi_pin"]');
    if (pinInput) {
      await pinInput.type('123456', { delay: 50 });
      console.log('🔐 Entered UPI PIN');
    }

    return generatedUpiId;
  }

  async processPayment() {
    const payButton = await this.page.waitForSelector(
      'button:has-text("Pay"), button:has-text("Pay Now"), button:has-text("Complete Payment"), button:has-text("Proceed")',
      { timeout: 10000 }
    );

    if (!payButton) {
      throw new Error('Payment button not found');
    }

    await payButton.click();
    console.log('🚀 Initiating payment...');

    await this.page.waitForTimeout(2000);

    const confirmButton = await this.page.$('button:has-text("Confirm"), button:has-text("Authorize")');
    if (confirmButton) {
      await confirmButton.click();
      console.log('✅ Payment confirmed');
      await this.page.waitForTimeout(1500);
    }

    return await this.waitForPaymentConfirmation();
  }

  async waitForPaymentConfirmation(timeout = 30000) {
    console.log('⏳ Waiting for payment confirmation...');

    try {
      const successIndicator = await Promise.race([
        this.page.waitForSelector(
          'div:has-text("Payment Successful"), div:has-text("Success"), .payment-success, .success-message',
          { timeout }
        ),
        this.page.waitForFunction(
          () => window.location.href.includes('/success') || window.location.href.includes('/dashboard'),
          { timeout }
        )
      ]);

      if (successIndicator) {
        console.log('✅ Payment successful!');
        const transactionId = this.generateTransactionId();

        const txnElement = await this.page.$('.transaction-id, [data-testid="transaction-id"], span:has-text("Transaction ID")');
        if (txnElement) {
          const displayedTxnId = await txnElement.evaluate(el => el.textContent);
          return { success: true, transactionId: displayedTxnId };
        }

        return { success: true, transactionId };
      }
    } catch (error) {
      const errorMessage = await this.page.$('.error-message, .payment-failed, div:has-text("Payment Failed")');
      if (errorMessage) {
        const errorText = await errorMessage.evaluate(el => el.textContent);
        console.error(`❌ Payment failed: ${errorText}`);
        return { success: false, error: errorText };
      }

      return { success: false, error: 'Payment timeout' };
    }
  }

  async mockSuccessfulPayment() {
    console.log('🎭 Mocking successful UPI payment...');

    const result = await this.page.evaluate((txnId) => {
      const mockOverlay = document.createElement('div');
      mockOverlay.id = 'mock-upi-payment';
      mockOverlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 40px; border-radius: 12px; max-width: 400px; text-align: center;">
            <div style="color: #4CAF50; font-size: 48px; margin-bottom: 20px;">✓</div>
            <h2 style="color: #333; margin-bottom: 10px;">Payment Successful!</h2>
            <p style="color: #666; margin-bottom: 20px;">Your UPI payment has been processed successfully.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #333;"><strong>Transaction ID:</strong> ${txnId}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Amount:</strong> ₹999</p>
              <p style="margin: 5px 0; color: #333;"><strong>Status:</strong> SUCCESS</p>
            </div>
            <button onclick="document.getElementById('mock-upi-payment').remove(); window.location.href='/dashboard';"
                    style="background: #4CAF50; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 16px; cursor: pointer;">
              Continue to Dashboard
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(mockOverlay);

      setTimeout(() => {
        if (document.getElementById('mock-upi-payment')) {
          document.getElementById('mock-upi-payment').remove();
          window.location.href = '/dashboard';
        }
      }, 5000);

      return { success: true, transactionId: txnId };
    }, this.generateTransactionId());

    await this.page.waitForTimeout(3000);
    return result;
  }

  async verifyPaymentInHistory() {
    console.log('📋 Verifying payment in transaction history...');

    const profileLink = await this.page.$('a[href="/profile"], a[href="/account"], button:has-text("Profile")');
    if (profileLink) {
      await profileLink.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    }

    const transactionsTab = await this.page.$('button:has-text("Transactions"), a:has-text("Payment History"), button:has-text("Orders")');
    if (transactionsTab) {
      await transactionsTab.click();
      await this.page.waitForTimeout(1500);

      const transactions = await this.page.$$('.transaction-item, .payment-row, tr[data-testid="transaction"]');
      console.log(`📊 Found ${transactions.length} transactions in history`);

      if (transactions.length > 0) {
        const latestTransaction = await transactions[0].evaluate(el => ({
          amount: el.querySelector('[class*="amount"], td:nth-child(2)')?.textContent,
          status: el.querySelector('[class*="status"], td:nth-child(3)')?.textContent,
          date: el.querySelector('[class*="date"], td:nth-child(4)')?.textContent,
          method: el.querySelector('[class*="method"], td:nth-child(5)')?.textContent
        }));

        console.log('Latest transaction:', latestTransaction);
        return latestTransaction;
      }
    }

    return null;
  }

  async handlePaymentError(errorType = 'insufficient_funds') {
    const errorMessages = {
      insufficient_funds: 'Insufficient balance in your account',
      invalid_upi: 'Invalid UPI ID. Please check and try again',
      timeout: 'Payment request timed out. Please try again',
      server_error: 'Server error. Please try again later',
      network_error: 'Network connection failed. Check your internet'
    };

    const errorMessage = errorMessages[errorType] || 'Payment failed';

    await this.page.evaluate((msg) => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'payment-error';
      errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 15px 25px; border-radius: 4px; z-index: 9999; box-shadow: 0 2px 5px rgba(0,0,0,0.2);';
      errorDiv.textContent = msg;
      document.body.appendChild(errorDiv);

      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }, errorMessage);

    console.error(`❌ Payment error: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }

  async retryPayment(maxRetries = 3) {
    let attempts = 0;
    let result = { success: false };

    while (attempts < maxRetries && !result.success) {
      attempts++;
      console.log(`🔄 Payment attempt ${attempts}/${maxRetries}`);

      try {
        await this.fillUPIDetails();
        result = await this.processPayment();

        if (!result.success && attempts < maxRetries) {
          console.log(`⏳ Waiting before retry...`);
          await this.page.waitForTimeout(3000);

          const retryButton = await this.page.$('button:has-text("Retry"), button:has-text("Try Again")');
          if (retryButton) {
            await retryButton.click();
          }
        }
      } catch (error) {
        console.error(`Error in attempt ${attempts}:`, error.message);
        result = { success: false, error: error.message };
      }
    }

    if (result.success) {
      console.log(`✅ Payment successful after ${attempts} attempt(s)`);
    } else {
      console.error(`❌ Payment failed after ${attempts} attempts`);
    }

    return result;
  }
}

module.exports = UPIPaymentHelper;