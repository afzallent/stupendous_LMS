import React, { useState } from 'react';

interface PaymentFormProps {
  courseId: string;
  courseTitle: string;
  price: number;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  courseId,
  courseTitle,
  price,
  onPaymentSuccess,
  onPaymentCancel
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit-card' | 'paypal'>('credit-card');
  const [error, setError] = useState<string | null>(null);

  const formatCardNumber = (value: string) => {
    // Remove any non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Format with spaces after every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    // Remove any non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Add slash after first 2 digits (MM/YY)
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDate(formatExpiryDate(e.target.value));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow up to 3 digits for CVV
    const value = e.target.value.replace(/\D/g, '').substring(0, 3);
    setCvv(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (paymentMethod === 'credit-card') {
      // Validate fields
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        setError('Please enter a valid card number');
        return;
      }
      
      if (!expiryDate || expiryDate.length < 5) {
        setError('Please enter a valid expiry date');
        return;
      }
      
      if (!cvv || cvv.length < 3) {
        setError('Please enter a valid CVV');
        return;
      }
      
      if (!nameOnCard) {
        setError('Please enter the name on card');
        return;
      }
    }
    
    // Process payment
    setIsProcessing(true);
    
    try {
      // Simulate API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would be an API call to process payment
      // For demo, we'll generate a random transaction ID
      const transactionId = 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase();
      onPaymentSuccess(transactionId);
    } catch (error) {
      setError('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Complete Your Purchase</h2>
      
      <div className="border rounded-md p-4 mb-6 bg-gray-50">
        <h3 className="font-medium text-gray-700 mb-2">Order Summary</h3>
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">{courseTitle}</span>
          <span className="font-medium">${price.toFixed(2)}</span>
        </div>
        <div className="border-t border-gray-200 my-2"></div>
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>${price.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            type="button"
            className={`flex-1 py-2 rounded-md ${
              paymentMethod === 'credit-card' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setPaymentMethod('credit-card')}
          >
            Credit Card
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-md ${
              paymentMethod === 'paypal' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setPaymentMethod('paypal')}
          >
            PayPal
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 text-red-600 p-3 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {paymentMethod === 'credit-card' ? (
          <>
            <div className="mb-4">
              <label htmlFor="cardNumber" className="block text-gray-700 mb-1 text-sm font-medium">
                Card Number
              </label>
              <input
                id="cardNumber"
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex space-x-4 mb-4">
              <div className="w-1/2">
                <label htmlFor="expiryDate" className="block text-gray-700 mb-1 text-sm font-medium">
                  Expiry Date
                </label>
                <input
                  id="expiryDate"
                  type="text"
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                  placeholder="MM/YY"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="w-1/2">
                <label htmlFor="cvv" className="block text-gray-700 mb-1 text-sm font-medium">
                  CVV
                </label>
                <input
                  id="cvv"
                  type="text"
                  value={cvv}
                  onChange={handleCvvChange}
                  placeholder="123"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="nameOnCard" className="block text-gray-700 mb-1 text-sm font-medium">
                Name on Card
              </label>
              <input
                id="nameOnCard"
                type="text"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
                placeholder="John Doe"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        ) : (
          <div className="mb-6 text-center p-4 border rounded-md bg-gray-50">
            <p className="text-gray-600 mb-4">
              You will be redirected to PayPal to complete your purchase.
            </p>
            <img 
              src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" 
              alt="PayPal Checkout"
              className="mx-auto h-10"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onPaymentCancel}
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isProcessing}
            className={`px-6 py-2 rounded-md font-medium ${
              isProcessing 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isProcessing ? 'Processing...' : `Pay $${price.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm; 