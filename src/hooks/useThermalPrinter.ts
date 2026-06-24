import { useState, useCallback, useEffect } from 'react';

// Web Serial API types (not yet in TypeScript's standard lib)
interface WebSerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array>;
}
type WebSerialNavigator = Navigator & {
  serial: {
    getPorts(): Promise<WebSerialPort[]>;
    requestPort(): Promise<WebSerialPort>;
  };
};

// Common ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;

const COMMANDS = {
  INIT: new Uint8Array([ESC, 0x40]), // Initialize printer
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  TEXT_NORMAL: new Uint8Array([ESC, 0x21, 0x00]),
  TEXT_BOLD: new Uint8Array([ESC, 0x45, 0x01]),
  TEXT_BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  TEXT_DOUBLE_HEIGHT: new Uint8Array([ESC, 0x21, 0x10]),
  TEXT_DOUBLE_WIDTH: new Uint8Array([ESC, 0x21, 0x20]),
  TEXT_DOUBLE_BOTH: new Uint8Array([ESC, 0x21, 0x30]),
  CUT_PAPER: new Uint8Array([GS, 0x56, 0x41, 0x10]), // Partial cut
  NEWLINE: new Uint8Array([0x0A]),
};

export function useThermalPrinter() {
  const [port, setPort] = useState<WebSerialPort | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Web Serial API is supported
  const isSupported = 'serial' in navigator;

  // Auto-reconnect if port was previously authorized
  useEffect(() => {
    if (!isSupported) return;
    
    const getPorts = async () => {
      try {
        const ports = await (navigator as WebSerialNavigator).serial.getPorts();
        if (ports.length > 0) {
          // Attempt to open the first previously authorized port
          const p = ports[0];
          if (p) {
            await p.open({ baudRate: 9600 });
            setPort(p);
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error("Auto-connect printer failed", err);
      }
    };
    getPorts();
  }, [isSupported]);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('Web Serial API is not supported in this browser. Please use Chrome/Edge on Desktop.');
      return false;
    }

    try {
      setError(null);
      const p = await (navigator as WebSerialNavigator).serial.requestPort();
      await p.open({ baudRate: 9600 }); // Common baud rate for thermal printers
      setPort(p);
      setIsConnected(true);
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setError(error.message || 'Failed to connect to printer.');
      return false;
    }
  }, [isSupported]);

  const disconnect = useCallback(async () => {
    if (port) {
      try {
        await port.close();
      } catch (e) {
        console.error(e);
      }
      setPort(null);
      setIsConnected(false);
    }
  }, [port]);

  const printReceipt = useCallback(async (textLines: string[], storeName: string) => {
    if (!port || !isConnected) {
      setError('Printer not connected.');
      return false;
    }

    try {
      const writer = port.writable.getWriter();
      
      const sendBytes = async (bytes: Uint8Array) => {
        await writer.write(bytes);
      };

      const sendText = async (text: string) => {
        const encoder = new TextEncoder();
        await sendBytes(encoder.encode(text));
      };

      // 1. Initialize
      await sendBytes(COMMANDS.INIT);
      
      // 2. Header (Store Name)
      await sendBytes(COMMANDS.ALIGN_CENTER);
      await sendBytes(COMMANDS.TEXT_DOUBLE_BOTH);
      await sendText(storeName + '\n');
      
      // 3. Reset to normal and print body
      await sendBytes(COMMANDS.TEXT_NORMAL);
      await sendBytes(COMMANDS.ALIGN_LEFT);
      await sendBytes(COMMANDS.NEWLINE);

      for (const line of textLines) {
        await sendText(line + '\n');
      }

      // 4. Footer & Cut
      await sendBytes(COMMANDS.NEWLINE);
      await sendBytes(COMMANDS.NEWLINE);
      await sendBytes(COMMANDS.NEWLINE);
      await sendBytes(COMMANDS.CUT_PAPER);

      await writer.close();
      return true;
    } catch (err: unknown) {
      const printError = err as Error;
      console.error(printError);
      setError('Failed to print: ' + printError.message);
      return false;
    }
  }, [port, isConnected]);

  return {
    isSupported,
    isConnected,
    connect,
    disconnect,
    printReceipt,
    error
  };
}
