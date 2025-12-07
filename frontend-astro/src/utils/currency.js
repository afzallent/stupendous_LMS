export async function updatePricesBasedOnLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const country = data.country;
    
    const currencySymbols = document.querySelectorAll('.currency-symbol');
    const programFees = document.querySelectorAll('.program-fee');
    
    let symbol = '₹'; // Default to INR
    let feeType = 'fee'; // Default to INR fee
    
    if (country === 'AE') {
      symbol = 'AED ';
      feeType = 'fee-aed';
    } else if (country !== 'IN') {
      symbol = '$ ';
      feeType = 'fee-usd';
    }
    
    currencySymbols.forEach(el => {
      el.textContent = symbol;
    });
    
    programFees.forEach(el => {
      const fee = el.getAttribute(`data-${feeType}`);
      el.textContent = fee;
    });
  } catch (error) {
    console.error('Error detecting location:', error);
    // Fallback to INR if location detection fails
  }
}