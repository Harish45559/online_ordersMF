// pages/StripeWrapper.jsx
import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Checkout from './Checkout';

const stripePromise = loadStripe('pk_live_51RQmk21jSPldIBwdJrOQRNgTlowQ1eLRw645k2KOVghMWZPZJSzZeG9R3l19cWhLfYj6PwHRnwLiZSIj2yD3oR8H00FksShQtq'); // Replace with your real key

const StripeWrapper = () => (
  <Elements stripe={stripePromise}>
    <Checkout />
  </Elements>
);

export default StripeWrapper;
