import {
  OAuthCredential,
  signInWithPopup,
  signOut,
  TwitterAuthProvider,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { BrandTwitter, FaceIdError, Icon, Menu2, X } from 'tabler-icons-react';
import logo from '../../assets/images/logo.png';
import { firebaseAuth, firestoreDB } from '../../firebase/firebase-client';
import TwitterButton from '../resusable-controls/twitter-button';

interface NavOptions {
  name: string;
  link: string;
  icon: Icon;
  active: boolean;
}

interface Props {
  session: User | null;
  setSession: React.Dispatch<React.SetStateAction<User | null>>;
  setOAuthCredential: React.Dispatch<React.SetStateAction<OAuthCredential | null>>;
}

function Navigation({ session, setSession, setOAuthCredential }: Props) {
  const [navOptions, setNavOptions] = useState<Array<NavOptions>>([]);
  const [show, setShow] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    setNavOptions([
      {
        name: 'About',
        link: '/about',
        icon: BrandTwitter,
        active: window.location.pathname === '/about',
      },
    ]);
  }, [navigate]);

  const authHandler = () => {
    if (session) {
      signOut(firebaseAuth)
        .then(() => {
          setSession(null);
          setOAuthCredential(null);
          sessionStorage.clear();
          window.location.href = '/';
        })
        .catch(() => {
          toast('Just close the tab to logout', {
            icon: <FaceIdError />,
          });
        });
    } else {
      const provider = new TwitterAuthProvider();
      signInWithPopup(firebaseAuth, provider)
        .then((result) => {
          // This gives you a the Twitter OAuth 1.0 Access Token and Secret.
          // You can use these server side with your app's credentials to access the Twitter API.
          if (result) {
            const user = {
              name: result?.user.displayName,
              // eslint-disable-next-line @typescript-eslint/dot-notation
              username: JSON.parse(JSON.stringify(result))['_tokenResponse']?.screenName,
              score: 0,
            };
            const userSecret = {
              secret: '',
            };
            const userScoreRef = doc(firestoreDB, 'score', result.user.uid);
            const userSecretRef = doc(firestoreDB, 'userSecrets', result.user.uid);
            getDoc(userScoreRef)
              .then((docSnap) => {
                if (!docSnap.exists()) {
                  setDoc(userScoreRef, user);
                }
              })
              .catch(() =>
                toast("Score card wasn't created please login again", { icon: <FaceIdError /> }),
              );
            getDoc(userSecretRef)
              .then((docSnap) => {
                if (!docSnap.exists()) {
                  setDoc(userSecretRef, userSecret);
                }
              })
              .catch(() =>
                toast('Elon Musk is making some changes!!! Try again later', {
                  icon: <FaceIdError />,
                }),
              );
            const credential = TwitterAuthProvider.credentialFromResult(result);
            setOAuthCredential(credential);
            sessionStorage.setItem('oauth_credential', JSON.stringify(credential));
          }
        })
        .catch(() => {
          toast('Twitter messed up!! try logging in again', { icon: <FaceIdError /> });
        });
    }
  };

  const setCurrentNav = (clickedNav: string) => {
    setNavOptions(
      navOptions.map((nav) => {
        if (nav.name === clickedNav) return { ...nav, active: true };
        return { ...nav, active: false };
      }),
    );
  };

  return (
    <div className="bg-gray-200 h-full w-full">
      <nav className="bg-white shadow lg:block hidden">
        <div className="mx-auto container px-6 py-2 lg:py-0">
          <div className="flex items-center justify-between">
            <div className="flex w-full sm:w-auto items-center sm:items-stretch justify-end sm:justify-start">
              <Link to="/" className="flex items-center" onClick={() => setCurrentNav('home')}>
                <img src={logo} alt="logo" style={{ width: '50px' }} />
                <h2 className="text-base font-bold leading-normal pl-3">Who's The Tweeter</h2>
              </Link>
            </div>
            <div className="flex">
              <div className="flex md:mr-6 lg:mr-16 xl:mr-32">
                {navOptions.map((nav) => (
                  <Link
                    to={nav.link}
                    key={nav.name}
                    className={`flex px-5 items-center py-6 text-sm leading-5 hover:bg-gray-100 focus:bg-gray-100 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none transition duration-150 ease-in-out ${
                      nav.active
                        ? 'border-b-2 border-b-indigo-700/50 bg-gray-100 text-indigo-700'
                        : ''
                    }`}
                    onClick={() => setCurrentNav(nav.name)}
                  >
                    <span className="mr-2">
                      <nav.icon strokeWidth={1.5} className="w-full h-full" />
                    </span>
                    {nav.name}
                  </Link>
                ))}
              </div>
              <div className="flex items-center">
                <TwitterButton
                  label={session ? 'Log out' : 'Sign in with Twitter'}
                  onClick={authHandler}
                />
              </div>
            </div>
          </div>
        </div>
      </nav>
      <nav className="bg-white shadow">
        <div
          className={`py-2 px-6 w-full flex lg:hidden justify-between items-center bg-white ${
            show ? 'fixed ' : ''
          }top-0 z-40`}
        >
          <div>
            <Link to="/" onClick={() => setCurrentNav('home')}>
              <img src={logo} alt="logo" style={{ width: '50px' }} />
            </Link>
          </div>
          {show ? (
            ''
          ) : (
            <Link to="/" onClick={() => setCurrentNav('home')}>
              <h2 className="text-base text-gray-700 font-bold leading-normal">
                Who's The Tweet-er
              </h2>
            </Link>
          )}
          <div className="flex items-center">
            <div id="menu" className="text-gray-800" onClick={() => setShow(!show)}>
              {show ? '' : <Menu2 strokeWidth={1.5} />}
            </div>
          </div>
        </div>
        {/* Mobile responsive sidebar */}
        <div
          className={
            show
              ? 'w-full lg:hidden h-full absolute z-40  transform  translate-x-0'
              : 'w-full lg:hidden h-full absolute z-40  transform -translate-x-full'
          }
        >
          <div className="bg-gray-800 opacity-50 w-full h-full" onClick={() => setShow(!show)} />
          <div className="w-64 z-40 fixed overflow-y-auto top-0 bg-white shadow h-full flex-col justify-between pb-4 transition duration-150 ease-in-out">
            <div className="px-6 h-full">
              <div className="flex flex-col justify-between h-full w-full">
                <div>
                  <div className="mt-6 flex w-full items-center justify-between">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Link
                          to="/"
                          onClick={() => {
                            setCurrentNav('home');
                            setShow(!show);
                          }}
                        >
                          <img src={logo} alt="logo" style={{ width: '50px' }} />
                        </Link>
                        <Link
                          to="/"
                          onClick={() => {
                            setCurrentNav('home');
                            setShow(!show);
                          }}
                        >
                          <h2 className="text-base text-gray-700 font-bold leading-normal ml-3">
                            Who's The Tweet-er
                          </h2>
                        </Link>
                      </div>
                      <div id="cross" className="text-gray-800" onClick={() => setShow(!show)}>
                        <X strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                  <ul className="f-m-m">
                    {navOptions.map((nav) => (
                      <li className="text-gray-800 pt-8" key={nav.name}>
                        <Link
                          to={nav.link}
                          onClick={() => setShow(!show)}
                          className="cursor-pointer text-gray-700 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none transition duration-150 ease-in-out"
                        >
                          <div className="flex items-center">
                            <div className="w-6 h-6">
                              <nav.icon strokeWidth={1.5} className="w-full h-full" />
                            </div>
                            <p className="text-base ml-3 ">{nav.name}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-full">
                  <TwitterButton
                    label={session ? 'Log out' : 'Sign in with Twitter'}
                    onClick={authHandler}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default Navigation;
