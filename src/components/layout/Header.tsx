import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ShoppingCart, Menu, X, Youtube, Send, Phone, Linkedin, Instagram, LogOut, User, Settings, LayoutDashboard, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cartAPI } from "@/lib/api";

const Header = () => {
  const navigationItems = [
    { title: 'Home', href: '/' },
    { title: 'Mentorship', href: '/mentorship' },
    { title: 'Test Series', href: '/test-series' },
    { title: 'Books', href: '/books' },
    { title: 'Free Resources', href: '/free-resources' },
    { title: 'About', href: '/about' },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  // Fetch cart count when user is logged in
  useEffect(() => {
    const fetchCartCount = async () => {
      if (user && userRole === 'user') {
        try {
          const res = await cartAPI.get();
          const items = (res as any).items || [];
          setCartCount(items.length);
        } catch (err) {
          console.error('Error fetching cart:', err);
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    fetchCartCount();
    
    // Listen for cart updates (when items are removed)
    const handleCartUpdate = () => {
      fetchCartCount();
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    // Set up interval to refresh cart count every 5 seconds
    const interval = setInterval(fetchCartCount, 5000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [user, userRole]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getDashboardPath = () => {
    switch (userRole) {
      case 'admin':
        return '/admin';
      case 'subadmin':
        return '/subadmin';
      default:
        return '/dashboard';
    }
  };

  const getDashboardLabel = () => {
    switch (userRole) {
      case 'admin':
        return 'Admin Panel';
      case 'subadmin':
        return 'SubAdmin Panel';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex gap-6">
            <Link to="/about" className="hover:underline">ABOUT US</Link>
            <Link to="/contact" className="hover:underline">CONTACT US</Link>
          </div>
          <div className="flex gap-4">
            <a href="https://youtube.com/@casuccessful?si=N6WIjOIt9qb5morZ" className="hover:opacity-80"><Youtube size={18} /></a>
            <a href="https://t.me/CASuccessful" className="hover:opacity-80"><Send size={18} /></a>
            {/* <a href="#" className="hover:opacity-80"><Phone size={18} /></a> */}
            <a href="#" className="hover:opacity-80"><Linkedin size={18} /></a>
            <a href="https://www.instagram.com/ca_successful" className="hover:opacity-80"><Instagram size={18} /></a>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img src="/logo.svg" alt="CA Successful" className="h-16 object-contain" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navigationItems.map((item) => (
                <div key={item.title} className="relative group">
                  <Link
                    to={item.href}
                    className="nav-link flex items-center gap-1 py-4"
                  >
                    {item.title}
                    {item.children && <ChevronDown size={16} />}
                  </Link>
                  
                  {item.children && (
                    <div className="dropdown-content">
                      {item.children.map((child) => (
                        <div key={child.title} className="relative group/sub">
                          <Link
                            to={child.href}
                            className="dropdown-item flex items-center justify-between"
                          >
                            {child.title}
                            {child.children && <ChevronDown size={14} className="-rotate-90" />}
                          </Link>
                          
                          {child.children && (
                            <div className="absolute left-full top-0 bg-card shadow-xl rounded-lg py-2 min-w-[200px] opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-200 border border-border">
                              {child.children.map((subChild) => (
                                <Link
                                  key={subChild.title}
                                  to={subChild.href}
                                  className="dropdown-item"
                                >
                                  {subChild.title}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Show cart only for logged-in regular users */}
              {user && userRole === 'user' && (
                <Link to="/cart" className="relative">
                  <ShoppingCart className="text-foreground" size={24} />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}
              
              {user && userRole === 'user' ? (
                <div className="relative">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-secondary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User size={18} className="text-muted-foreground" />
                    </div>
                  </button>

                  {mobileMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card shadow-lg rounded-lg border border-border py-2 z-50">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>

                      <button
                        onClick={() => { navigate(getDashboardPath()); setMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-secondary transition-colors"
                      >
                        <LayoutDashboard size={18} />
                        <span>{getDashboardLabel()}</span>
                      </button>

                      <button
                        onClick={() => { navigate('/dashboard?tab=settings'); setMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-secondary transition-colors"
                      >
                        <Settings size={18} />
                        <span>Settings</span>
                      </button>

                      <button
                        onClick={() => { navigate('/dashboard?tab=address'); setMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-secondary transition-colors"
                      >
                        <MapPin size={18} />
                        <span>Address</span>
                      </button>

                      <div className="border-t border-border mt-2">
                        <button
                          onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-secondary text-destructive transition-colors"
                        >
                          <LogOut size={18} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => navigate(getDashboardPath())}
                    variant="outline"
                  >
                    <LayoutDashboard size={18} className="mr-2" />
                    {getDashboardLabel()}
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                  >
                    <LogOut size={18} className="mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    onClick={() => navigate("/login?tab=signup")}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <span>Sign Up</span>
                  </Button>
                  <Button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 btn-primary"
                  >
                    <User size={18} />
                    <span>Login</span>
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden text-foreground"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-border">
              {navigationItems.map((item) => (
                <div key={item.title} className="py-2">
                  <Link
                    to={item.href}
                    className="block font-medium text-foreground hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                </div>
              ))}
              <div className="pt-4 border-t border-border mt-4 space-y-2">
                {user ? (
                  <>
                    <Button
                      onClick={() => { navigate(getDashboardPath()); setMobileMenuOpen(false); }}
                      className="w-full btn-primary"
                    >
                      <LayoutDashboard size={18} className="mr-2" />
                      {getDashboardLabel()}
                    </Button>

                    <Button
                      onClick={() => { navigate('/dashboard?tab=settings'); setMobileMenuOpen(false); }}
                      variant="outline"
                      className="w-full"
                    >
                      <Settings size={18} className="mr-2" />
                      Settings
                    </Button>

                    <Button
                      onClick={() => { navigate('/dashboard?tab=address'); setMobileMenuOpen(false); }}
                      variant="outline"
                      className="w-full"
                    >
                      <MapPin size={18} className="mr-2" />
                      Address
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="w-full"
                    >
                      <LogOut size={18} className="mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={() => { navigate("/login?tab=signup"); setMobileMenuOpen(false); }} 
                      variant="outline"
                      className="w-full"
                    >
                      <span>Sign Up</span>
                    </Button>
                    <Button 
                      onClick={() => { navigate("/login"); setMobileMenuOpen(false); }} 
                      className="w-full btn-primary"
                    >
                      <User size={18} className="mr-2" />
                      Login
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;