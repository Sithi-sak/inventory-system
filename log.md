./src/components/stock-history-modal.tsx:53:24
Type error: Block-scoped variable 'fetchHistory' used before its declaration.

51 | fetchHistory();
52 | }

> 53 | }, [open, productId, fetchHistory]);

     |                        ^

54 |
55 | const fetchHistory = useCallback(async () => {
56 | setLoading(true);
Next.js build worker exited with code: 1 and signal: null
 ELIFECYCLE  Command failed with exit code 1.
