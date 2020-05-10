import React from 'react';
import ReactDOM from 'react-dom';
import { SignalWrapper } from './SignalContext';
import Room from './Room';

ReactDOM.render(
  (
    <SignalWrapper>
      <Room />
    </SignalWrapper>
  ),
  document.getElementById('root')
);