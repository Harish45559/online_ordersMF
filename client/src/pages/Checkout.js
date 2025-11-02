import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '../components/CheckoutForm';

const stripePromise = loadStripe('pk_live_51RQmk21jSPldIBwdJrOQRNgTlowQ1eLRw645k2KOVghMWZPZJSzZeG9R3l19cWhLfYj6PwHRnwLiZSIj2yD3oR8H00FksShQtq'); // Replace with your Stripe public key

const Checkout = () => {
  return (
    <div className="checkout-page">
      <h2 className="text-2xl font-semibold text-center my-6">Checkout</h2>
      <div className="max-w-xl mx-auto border p-6 rounded shadow">
        <Elements stripe={stripePromise}>
          <CheckoutForm />
        </Elements>
      </div>
    </div>
  );
};

export default Checkout;
