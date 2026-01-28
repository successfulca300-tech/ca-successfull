import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cartAPI } from '@/lib/api';
import { Skeleton } from "@/components/ui/skeleton";

interface CartItem {
  itemId: string;
  itemType: string;
  title: string;
  thumbnail?: string;
  price: number;
  qty?: number;
  _id?: string;
}

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await cartAPI.get();
        const items = (res as any).items || [];
        setCartItems(items);
      } catch (err) {
        console.error('Error loading cart', err);
        toast.error('Failed to load cart');
      } finally {
        setLoading(false);
      }
    };
    load();
    
    // Listen for cart updates (from removal) to refresh cart
    const handleCartUpdate = () => {
      load();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const removeItem = async (itemId: string) => {
    try {
      const res = await cartAPI.remove(itemId);
      const updatedItems = (res as any).items || [];
      setCartItems(updatedItems);

      // Trigger cart count update in header by dispatching custom event
      window.dispatchEvent(new Event('cartUpdated'));

      toast.success("Item removed from cart");
    } catch (err) {
      console.error('Remove from cart failed', err);
      toast.error('Failed to remove item');
    }
  };

  const total = cartItems.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);

  if (loading) {
    return (
      <Layout>
        <div className="bg-primary py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">Cart</h1>
          </div>
        </div>
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (!loading && cartItems.length === 0) {
    return (
      <Layout>
        <div className="py-20 text-center bg-background min-h-[60vh] flex flex-col items-center justify-center">
          <ShoppingBag className="text-muted-foreground mb-4" size={64} />
          <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Browse our courses and add them to cart</p>
          <Link to="/classes">
            <Button className="btn-primary">Browse Courses</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft size={20} className="mr-2" />
            Go Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">Shopping Cart</h1>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item._id || item.itemId}
                  className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <img
                    src={item.thumbnail || '/placeholder.svg'}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{item.itemType}</p>
                    {item.qty && item.qty > 1 && (
                      <p className="text-sm text-muted-foreground">Qty: {item.qty}</p>
                    )}
                    <p className="font-bold text-lg text-primary mt-1">
                      ₹{(item.price * (item.qty || 1)).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(item.itemId)}
                    className="flex-shrink-0"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card p-6 rounded-xl shadow-md border border-border sticky top-24">
                <h3 className="text-xl font-semibold mb-4">Cart Summary</h3>
                
                <div className="space-y-3 mb-6 pb-6 border-b border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold">₹{total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="text-green-600">₹0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span>₹0</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-3xl font-bold text-primary">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => navigate("/classes")}
                  className="w-full py-6"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
