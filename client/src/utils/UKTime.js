import React, { useEffect, useState } from 'react';
import { DateTime } from 'luxon';

const UKTime = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = DateTime.now().setZone('Europe/London').toFormat('dd/MM/yyyy HH:mm:ss');
      setTime(currentTime);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <div>UK Time: {time}</div>;
};

export default UKTime;
