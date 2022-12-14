import axios from 'axios';
import cryptoRandomString from 'crypto-random-string';
import { OAuthCredential, User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaceIdError } from 'tabler-icons-react';
import { firestoreDB } from '../../firebase/firebase-client';
import { Following, FollowingTweets, Question } from '../../models/models';
import { encryptData } from '../../utilities/encryption';
import generateQuestions from '../../utilities/generate-questions';
import GameScreen from '../game-screen/game-screen';
import Button from '../resusable-controls/button';
import ScoreBoard from '../score/score-board';
import FollowingList from './following-list';
import Instructions from './instructions';

interface Props {
  oAuthCredential: OAuthCredential | null;
  session: User | null;
}

function Home({ oAuthCredential, session }: Props) {
  const [stage, setStage] = useState<'start' | 'following' | 'ingame'>('start');
  const [following, setFollowing] = useState<Array<Following>>([]);
  const [questions, setQuestions] = useState<Array<Question>>([]);
  const [disableStartButton, setDisableStartButton] = useState(false);
  const [disableFollowingButton, setDisableFollowingButton] = useState(false);
  const userSecretsRef = doc(firestoreDB, 'userSecrets', session?.uid || 'blah');

  const onStartHandler = async () => {
    try {
      const userSecret = cryptoRandomString({ length: 10, type: 'base64' });
      if (oAuthCredential?.accessToken && oAuthCredential.secret && session) {
        setDisableStartButton(true);
        const token = encryptData(
          JSON.stringify({
            accessToken: oAuthCredential.accessToken,
            accessSecret: oAuthCredential.secret,
            eat: Date.now() + 60000,
          }),
          userSecret,
        );
        await updateDoc(userSecretsRef, {
          secret: userSecret,
        });

        const { data }: { data: Array<Following> } = await axios.get(
          '/.netlify/functions/get-following',
          {
            params: {
              token,
              uid: session?.uid,
            },
          },
        );
        await updateDoc(userSecretsRef, {
          secret: '',
        });
        if (Array.isArray(data)) {
          if (data.length > 2) {
            setFollowing(data);
            setStage('following');
          } else {
            toast("Why are you even playing you don't follow enough people", {
              icon: <FaceIdError />,
            });
          }
        } else {
          toast("Twitter isn't talking to us try again in some time", { icon: <FaceIdError /> });
        }
        setDisableStartButton(false);
      }
    } catch (_error) {
      await updateDoc(userSecretsRef, {
        secret: '',
      });
      toast("Twitter isn't talking to us try again in some time", { icon: <FaceIdError /> });
      setDisableStartButton(false);
    }
  };

  const onFollowingSubmitHandler = async () => {
    try {
      const userSecret = cryptoRandomString({ length: 10, type: 'base64' });
      const selectedCount = following.filter(({ selected }) => selected).length;
      if (selectedCount < 2) {
        toast('Did you even read the rules select atleast 2', { icon: <FaceIdError /> });
      } else if (selectedCount > 5) {
        toast('Did you even read the rules select atmost 5', { icon: <FaceIdError /> });
      } else if (oAuthCredential?.accessToken && oAuthCredential.secret && session) {
        setDisableFollowingButton(true);
        const token = encryptData(
          JSON.stringify({
            accessToken: oAuthCredential.accessToken,
            accessSecret: oAuthCredential.secret,
            following: following
              .filter(({ selected }) => !!selected)
              .map(({ id }) => id)
              .join(','),
            eat: Date.now() + 60000,
          }),
          userSecret,
        );
        await updateDoc(userSecretsRef, {
          secret: userSecret,
        });

        const { data }: { data: FollowingTweets } = await axios.get(
          '/.netlify/functions/get-tweets-for-following',
          {
            params: {
              token,
              uid: session.uid,
            },
          },
        );
        await updateDoc(userSecretsRef, {
          secret: '',
        });

        if (Array.isArray(data) && data.length > 0) {
          const genQuestions = await generateQuestions(data, session);
          if (genQuestions.length > 0) {
            setQuestions(genQuestions);
            setStage('ingame');
          } else {
            toast('These people s@#k, choose someone else', { icon: <FaceIdError /> });
          }
        } else {
          toast('Twitter hates me cause am cooler, try again in some time', {
            icon: <FaceIdError />,
          });
        }
        setDisableFollowingButton(false);
      }
    } catch (_error) {
      await updateDoc(userSecretsRef, {
        secret: '',
      });
      setDisableFollowingButton(false);
      toast('Twitter hates me cause am cooler, try again in some time', { icon: <FaceIdError /> });
    }
  };

  const onExitHandler = () => {
    setStage('start');
    setFollowing([]);
    setQuestions([]);
  };

  return (
    <div className="container mx-auto p-5 xl:px-0 grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-8 md:h-[85vh] max-w-[1200px]">
      <div className="p-5 md:col-span-3 h-auto">
        {session ? (
          <div className="flex flex-col items-center">
            {stage === 'start' && (
              <>
                <Button
                  disabled={disableStartButton}
                  label={disableStartButton ? 'Loading...' : 'Start Game'}
                  type="button"
                  onClick={onStartHandler}
                />
                <div className="mt-5">
                  <Instructions />
                </div>
              </>
            )}
            {stage === 'following' && (
              <FollowingList
                following={following}
                setFollowing={setFollowing}
                onFollowingSubmitHandler={onFollowingSubmitHandler}
                disableFollowingButton={disableFollowingButton}
              />
            )}
            {stage === 'ingame' && questions.length > 0 && (
              <GameScreen
                questions={questions}
                following={following}
                onExitHandler={onExitHandler}
                session={session}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">Please sign in with your Twitter account</div>
        )}
      </div>
      <div className="p-2 md:col-span-2 h-auto md:overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center">
          <ScoreBoard session={session} />
        </div>
      </div>
    </div>
  );
}

export default Home;
