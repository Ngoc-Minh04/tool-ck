import sys

class SafeStreamWrapper:
    def __init__(self, original_stream):
        self.original_stream = original_stream
    def write(self, data):
        try:
            self.original_stream.write(data)
        except UnicodeEncodeError:
            try:
                self.original_stream.write(data.encode('ascii', errors='replace').decode('ascii'))
            except:
                pass
    def flush(self):
        self.original_stream.flush()
    def __getattr__(self, name):
        return getattr(self.original_stream, name)

sys.stdout = SafeStreamWrapper(sys.stdout)
sys.stderr = SafeStreamWrapper(sys.stderr)

try:
    from vnstock import Market
    m = Market()
    
    print("\n--- Calling m.quote() ---")
    try:
        res = m.quote()
        print("res type:", type(res))
        print("res dir:", dir(res))
    except Exception as e:
        print("m.quote() failed:", e)
        
    print("\n--- Calling m.equity() ---")
    try:
        res2 = m.equity()
        print("res2 type:", type(res2))
        print("res2 dir:", dir(res2))
    except Exception as e:
        print("m.equity() failed:", e)
        
except Exception as e:
    print(f"Error: {e}")
