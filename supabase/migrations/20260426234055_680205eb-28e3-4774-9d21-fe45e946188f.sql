
-- ============================================
-- 1. ROLES UTILISATEURS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. POLICIES ADMIN POUR QUESTIONS
-- ============================================
CREATE POLICY "Admins can insert questions"
ON public.questions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update questions"
ON public.questions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all questions"
ON public.questions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage daily questions"
ON public.daily_questions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. MODE DUEL
-- ============================================
CREATE TABLE public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  creator_id UUID NOT NULL,
  creator_name TEXT NOT NULL,
  opponent_id UUID,
  opponent_name TEXT,
  theme question_theme NOT NULL,
  question_ids UUID[] NOT NULL,
  creator_score INTEGER,
  creator_answers JSONB,
  opponent_score INTEGER,
  opponent_answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur connecté peut consulter un duel via son code (lien partagé)
CREATE POLICY "Anyone authenticated can view duels"
ON public.duels FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create duels"
ON public.duels FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Le créateur peut mettre à jour son score, l'adversaire peut rejoindre + son score
CREATE POLICY "Participants can update duels"
ON public.duels FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id OR opponent_id IS NULL OR auth.uid() = opponent_id);

CREATE TRIGGER update_duels_updated_at
BEFORE UPDATE ON public.duels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_duels_code ON public.duels(code);
CREATE INDEX idx_duels_creator ON public.duels(creator_id);
CREATE INDEX idx_duels_opponent ON public.duels(opponent_id);

-- ============================================
-- 4. NOUVELLES QUESTIONS (~90)
-- ============================================

-- VOCABULAIRE
INSERT INTO public.questions (theme, difficulty, question, choices, correct_index, explanation) VALUES
('vocabulaire', 'facile', 'Que veut dire "lit" (ou "c''est lit") chez les jeunes ?', '["Un meuble pour dormir","C''est génial, super","C''est ennuyeux","C''est faux"]'::jsonb, 1, '"Lit" vient de l''anglais et signifie "génial, incroyable". Quand un jeune dit "c''est lit", il veut dire que c''est super cool.'),
('vocabulaire', 'facile', 'Que signifie "mood" ?', '["Une humeur, un état d''esprit","Un repas","Un objet","Une chanson"]'::jsonb, 0, '"Mood" est l''anglais pour "humeur". On dit "c''est mon mood" pour dire "ça correspond à mon état d''esprit du moment".'),
('vocabulaire', 'facile', 'Que veut dire "flex" ?', '["Faire du sport","Frimer, se vanter","Être fatigué","Être triste"]'::jsonb, 1, '"Flex" signifie frimer, montrer fièrement quelque chose qu''on possède (vêtements, voiture...). Vient de "flex muscles" : montrer ses muscles.'),
('vocabulaire', 'facile', 'Que signifie "vibe" ?', '["Un type de musique","Une ambiance, une atmosphère","Un ami proche","Une mauvaise nouvelle"]'::jsonb, 1, 'La "vibe" désigne l''ambiance d''un lieu ou d''une personne. "Bonne vibe" = bonne ambiance, "il dégage une vibe sympa" = il a une atmosphère agréable.'),
('vocabulaire', 'moyen', 'Que veut dire "ghoster" quelqu''un ?', '["Lui faire peur","Disparaître sans donner de nouvelles","L''appeler souvent","Lui faire un cadeau"]'::jsonb, 1, '"Ghoster" (de "ghost", fantôme) signifie couper toute communication avec quelqu''un sans explication, souvent en amour ou en amitié.'),
('vocabulaire', 'moyen', 'Que signifie "FOMO" ?', '["La peur de rater quelque chose","Un type de musique","Un nouveau réseau social","Un jeu vidéo"]'::jsonb, 0, 'FOMO = "Fear Of Missing Out" : la peur de rater quelque chose d''important (une fête, un événement) que les autres vivent sans nous.'),
('vocabulaire', 'facile', 'Que veut dire "stylé" ?', '["Bien habillé, classe","Fatigué","En retard","Méchant"]'::jsonb, 0, '"Stylé" signifie qui a du style, qui est élégant ou cool. Peut décrire une personne, un objet ou une situation : "ta veste est stylée !"'),
('vocabulaire', 'moyen', 'Que veut dire "OKLM" ?', '["D''accord","Au calme, tranquille","Très bien","Trop drôle"]'::jsonb, 1, 'OKLM se prononce "au calme" et signifie tranquille, sans stress. "Je passe la soirée OKLM" = je passe une soirée tranquille.'),
('vocabulaire', 'facile', 'Que veut dire "MDR" ?', '["Mort de rire","Madame","Mon dernier rendez-vous","Marche dans la rue"]'::jsonb, 0, 'MDR = "Mort De Rire". C''est l''équivalent français de LOL (Laughing Out Loud) en anglais.'),
('vocabulaire', 'moyen', 'Que signifie "PTDR" ?', '["Pété de rire","Pour toujours","Petit déjeuner","Pas trop dormir"]'::jsonb, 0, 'PTDR = "Pété De Rire", une version plus forte de MDR. Utilisé quand quelque chose est vraiment très drôle.'),
('vocabulaire', 'moyen', 'Que veut dire "wesh" ?', '["Au revoir","Salut, hé","Merci","Pardon"]'::jsonb, 1, '"Wesh" est une salutation informelle, un peu comme "hé" ou "salut". Vient de l''arabe maghrébin.'),
('vocabulaire', 'difficile', 'Que signifie "no cap" ?', '["Pas de chapeau","Sans mentir, vraiment","Pas de capacité","Sans souci"]'::jsonb, 1, '"No cap" vient de l''anglais et signifie "sans mentir, sérieusement". À l''inverse, "cap" veut dire "tu mens".'),
('vocabulaire', 'moyen', 'Que veut dire "boomer" ?', '["Une bombe","Une personne âgée déconnectée","Un musicien","Un sportif"]'::jsonb, 1, '"Boomer" désigne au départ les baby-boomers. Aujourd''hui, "OK boomer" est utilisé (parfois moqueur) pour qualifier une personne âgée jugée dépassée.'),
('vocabulaire', 'facile', 'Que veut dire "crush" ?', '["Une personne sur qui on craque","Un sport","Un repas","Une dispute"]'::jsonb, 0, '"Crush" désigne une personne pour laquelle on a un coup de cœur amoureux. "J''ai un crush sur lui" = il me plaît beaucoup.'),
('vocabulaire', 'difficile', 'Que veut dire "ghoster" en amitié ?', '["Inviter à une soirée","Couper tout contact sans explication","Faire une blague","Offrir un cadeau"]'::jsonb, 1, 'Ghoster, ce n''est pas que pour l''amour : c''est cesser de répondre aux messages d''un ami sans explication, comme un fantôme qui disparaît.'),
('vocabulaire', 'moyen', 'Que veut dire "salty" ?', '["Salé","Vexé, rancunier","Affamé","Joyeux"]'::jsonb, 1, '"Salty" (salé en anglais) signifie être de mauvaise humeur, vexé ou jaloux. "Il est salty parce qu''il a perdu" = il fait la tête.'),
('vocabulaire', 'facile', 'Que signifie "spoiler" ?', '["Gâcher la surprise d''un film","Aller vite","S''ennuyer","Faire un cadeau"]'::jsonb, 0, '"Spoiler" un film ou une série, c''est révéler des éléments importants de l''intrigue à quelqu''un qui ne l''a pas encore vu.'),
('vocabulaire', 'difficile', 'Que veut dire "lowkey" ?', '["Discrètement, un peu","Très fort","En colère","En retard"]'::jsonb, 0, '"Lowkey" signifie "discrètement, un peu". "Je suis lowkey fatigué" = je suis un peu fatigué (sans vraiment l''avouer).'),
('vocabulaire', 'moyen', 'Que veut dire "deadass" ?', '["Très ennuyeux","Sérieusement, sans blague","Très drôle","Endormi"]'::jsonb, 1, '"Deadass" est de l''argot américain qui veut dire "sérieusement, je te jure". Équivalent de "wallah" ou "juré" en français.'),
('vocabulaire', 'facile', 'Que veut dire "binge-watcher" ?', '["Regarder plein d''épisodes d''affilée","Faire du sport","Cuisiner","Lire un livre"]'::jsonb, 0, '"Binge-watcher" (ou "binge-watching"), c''est regarder de nombreux épisodes d''une série les uns après les autres, sans pause.'),
('vocabulaire', 'difficile', 'Que veut dire "red flag" ?', '["Un drapeau rouge","Un signal d''alerte chez quelqu''un","Une bonne nouvelle","Une faute d''orthographe"]'::jsonb, 1, 'Un "red flag" (drapeau rouge) est un signe d''alerte indiquant qu''une personne ou situation est problématique, surtout en amour : "Il ne t''écoute jamais, c''est un red flag."'),
('vocabulaire', 'moyen', 'Que veut dire "green flag" ?', '["Un signe positif chez quelqu''un","Une autorisation","Un repas écolo","Un drapeau vert"]'::jsonb, 0, 'À l''inverse du "red flag", le "green flag" est un signe positif et rassurant chez une personne (gentillesse, écoute, honnêteté...).');

-- RESEAUX SOCIAUX
INSERT INTO public.questions (theme, difficulty, question, choices, correct_index, explanation) VALUES
('reseaux_sociaux', 'facile', 'Sur quel réseau partage-t-on des photos qui disparaissent ?', '["Facebook","Snapchat","LinkedIn","Twitter"]'::jsonb, 1, 'Snapchat (créé en 2011) est connu pour ses photos et vidéos éphémères qui disparaissent après quelques secondes.'),
('reseaux_sociaux', 'facile', 'À quoi sert principalement Instagram ?', '["Partager des photos et vidéos","Envoyer des emails","Faire des appels","Lire les actualités"]'::jsonb, 0, 'Instagram est un réseau social centré sur le partage de photos et vidéos. Lancé en 2010, il appartient aujourd''hui à Meta (Facebook).'),
('reseaux_sociaux', 'facile', 'Que sont les "stories" sur Instagram ou Snapchat ?', '["Des contes pour enfants","Des publications qui durent 24h","Des messages privés","Des publicités"]'::jsonb, 1, 'Les "stories" sont des photos ou vidéos visibles pendant 24 heures puis qui disparaissent. Idéales pour partager des moments du quotidien.'),
('reseaux_sociaux', 'facile', 'Quel est le format roi de TikTok ?', '["Les longs articles","Les courtes vidéos","Les podcasts","Les photos"]'::jsonb, 1, 'TikTok est l''application reine des vidéos courtes (15 secondes à 3 minutes), souvent musicales, drôles ou éducatives.'),
('reseaux_sociaux', 'moyen', 'Que veut dire "follower" ?', '["Quelqu''un qui te suit","Un photographe","Un publicitaire","Un journaliste"]'::jsonb, 0, 'Un "follower" (abonné en français) est une personne qui suit votre compte sur un réseau social pour voir vos publications.'),
('reseaux_sociaux', 'moyen', 'Que se passe-t-il quand un contenu devient "viral" ?', '["Il contient un virus","Il est vu par énormément de personnes","Il est supprimé","Il est privé"]'::jsonb, 1, 'Un contenu "viral" est partagé massivement et rapidement, comme une épidémie, atteignant des millions de personnes en peu de temps.'),
('reseaux_sociaux', 'facile', 'Sur quoi sert principalement WhatsApp ?', '["Acheter en ligne","Envoyer des messages et appels","Regarder des films","Faire du sport"]'::jsonb, 1, 'WhatsApp est une messagerie permettant d''envoyer des messages, photos, vidéos et de passer des appels gratuits via Internet.'),
('reseaux_sociaux', 'moyen', 'Qu''est-ce qu''un hashtag (#) ?', '["Une note de musique","Un mot-clé pour classer un contenu","Une erreur","Un emoji"]'::jsonb, 1, 'Le hashtag (#) est un mot ou une expression précédée du symbole "dièse" qui sert à classer et retrouver des publications sur un thème.'),
('reseaux_sociaux', 'difficile', 'Qu''est-ce que BeReal ?', '["Une appli de cuisine","Une appli qui demande une photo spontanée chaque jour","Un site de rencontre","Un journal en ligne"]'::jsonb, 1, 'BeReal est une appli française qui envoie chaque jour une notification à un moment imprévu pour prendre une photo spontanée à partager avec ses amis.'),
('reseaux_sociaux', 'moyen', 'Que veut dire "DM" ?', '["Direct Message (message privé)","Disque Magnétique","Double Mémoire","Dernière Minute"]'::jsonb, 0, '"DM" signifie "Direct Message" : un message privé envoyé à une personne sur un réseau social, par opposition à une publication publique.'),
('reseaux_sociaux', 'facile', 'Que fait-on avec le bouton "j''aime" (cœur) ?', '["On supprime un message","On indique qu''on apprécie un contenu","On envoie un cadeau","On bloque quelqu''un"]'::jsonb, 1, 'Le "j''aime" (ou "like") permet d''indiquer qu''on apprécie une publication. C''est l''interaction la plus rapide et populaire sur les réseaux.'),
('reseaux_sociaux', 'moyen', 'Qu''est-ce qu''un "influenceur" ?', '["Un policier","Une personne qui a beaucoup d''abonnés et influence ses choix","Un journaliste","Un chanteur"]'::jsonb, 1, 'Un influenceur est une personnalité des réseaux sociaux qui, grâce à sa communauté, influence les opinions, modes ou achats de ses abonnés.'),
('reseaux_sociaux', 'difficile', 'Que veut dire "shadowban" ?', '["Être banni officiellement","Voir sa visibilité réduite secrètement","Faire un live","Être célèbre"]'::jsonb, 1, 'Le "shadowban" est une sanction discrète : sans prévenir, un réseau social réduit la visibilité d''un compte. La personne continue à publier mais presque personne ne voit ses contenus.'),
('reseaux_sociaux', 'facile', 'Discord est principalement utilisé pour...', '["Faire ses courses","Discuter en groupe (texte/voix)","Regarder des films","Lire les actualités"]'::jsonb, 1, 'Discord est une plateforme de discussion par texte, voix et vidéo, très populaire chez les gamers et les communautés de passionnés.'),
('reseaux_sociaux', 'moyen', 'Que veut dire "story à la une" sur Instagram ?', '["Une publicité","Une story sauvegardée en permanence sur le profil","Un message privé","Une vidéo en direct"]'::jsonb, 1, 'Les "stories à la une" (highlights) sont des stories sauvegardées de façon permanente sur le profil, organisées par thèmes (voyages, famille...).'),
('reseaux_sociaux', 'difficile', 'Quelle entreprise possède Instagram et WhatsApp ?', '["Google","Meta (Facebook)","Apple","Microsoft"]'::jsonb, 1, 'Meta (anciennement Facebook), dirigée par Mark Zuckerberg, possède Facebook, Instagram, WhatsApp et Messenger.'),
('reseaux_sociaux', 'moyen', 'Que sont les "Reels" sur Instagram ?', '["Des photos","Des vidéos courtes façon TikTok","Des messages","Des publicités"]'::jsonb, 1, 'Les "Reels" sont les vidéos courtes d''Instagram (jusqu''à 90 secondes), créées pour concurrencer TikTok. Souvent musicales et créatives.'),
('reseaux_sociaux', 'facile', 'Que veut dire "live" sur les réseaux ?', '["Une vidéo enregistrée","Une diffusion en direct","Une photo","Un message vocal"]'::jsonb, 1, 'Un "live" est une vidéo diffusée en direct, en temps réel. Les abonnés peuvent regarder et commenter pendant la diffusion.'),
('reseaux_sociaux', 'moyen', 'X, c''est l''ancien nom de quel réseau ?', '["Facebook","Twitter","Snapchat","Instagram"]'::jsonb, 1, 'Twitter a été renommé "X" en 2023 par son nouveau propriétaire Elon Musk. Le petit oiseau bleu a été remplacé par la lettre X.'),
('reseaux_sociaux', 'difficile', 'Qui a racheté Twitter en 2022 ?', '["Mark Zuckerberg","Elon Musk","Bill Gates","Jeff Bezos"]'::jsonb, 1, 'Elon Musk, patron de Tesla et SpaceX, a racheté Twitter en octobre 2022 pour 44 milliards de dollars, puis l''a renommé X.'),
('reseaux_sociaux', 'facile', 'Que veut dire "tagger" quelqu''un ?', '["Le bloquer","Le mentionner dans une publication","Le supprimer","Le payer"]'::jsonb, 1, '"Tagger" (ou "identifier") une personne, c''est la mentionner dans une publication ou photo. Elle reçoit une notification.');

-- CULTURE POP
INSERT INTO public.questions (theme, difficulty, question, choices, correct_index, explanation) VALUES
('culture_pop', 'facile', 'Qui chante "Espresso" (succès de l''été 2024) ?', '["Taylor Swift","Sabrina Carpenter","Dua Lipa","Beyoncé"]'::jsonb, 1, 'Sabrina Carpenter, chanteuse américaine, a explosé en 2024 avec "Espresso", un tube léger devenu un phénomène mondial.'),
('culture_pop', 'moyen', 'Quelle série coréenne sur la survie a battu des records sur Netflix ?', '["Squid Game","Stranger Things","La Casa de Papel","Lupin"]'::jsonb, 0, '"Squid Game" (2021) est une série coréenne où des personnes endettées s''affrontent dans des jeux d''enfants mortels. Elle a battu des records de visionnages sur Netflix.'),
('culture_pop', 'facile', 'Quel chanteur français appelle ses fans "la Bande" ?', '["Aya Nakamura","Soprano","Gims","Stromae"]'::jsonb, 3, 'Stromae a renoué avec son public lors de sa tournée 2022-2023 après une longue absence, créant une vraie communauté.'),
('culture_pop', 'moyen', 'Quelle chanteuse française a connu un énorme succès avec "Djadja" ?', '["Aya Nakamura","Angèle","Louane","Pomme"]'::jsonb, 0, 'Aya Nakamura, chanteuse franco-malienne, a explosé avec "Djadja" en 2018. Elle est aujourd''hui l''artiste française la plus écoutée dans le monde.'),
('culture_pop', 'facile', 'Quel jeu vidéo permet de construire avec des cubes ?', '["Fortnite","Minecraft","Call of Duty","FIFA"]'::jsonb, 1, 'Minecraft est un jeu où l''on explore et construit dans un monde fait de cubes. C''est l''un des jeux les plus vendus de tous les temps.'),
('culture_pop', 'moyen', 'Dans Fortnite, que doivent faire les joueurs principalement ?', '["Cuisiner","Survivre et être le dernier en vie","Conduire des voitures","Faire du sport"]'::jsonb, 1, 'Fortnite est un "Battle Royale" : 100 joueurs s''affrontent sur une carte qui rétrécit, et le dernier (ou la dernière équipe) en vie gagne.'),
('culture_pop', 'facile', 'Quelle plateforme est célèbre pour ses concerts virtuels et avatars ?', '["Roblox","WhatsApp","Gmail","Skype"]'::jsonb, 0, 'Roblox est une plateforme de jeux où les utilisateurs créent leurs propres mondes. Très populaire chez les jeunes, elle a accueilli des concerts virtuels.'),
('culture_pop', 'moyen', 'Qui est K-pop ?', '["Un genre musical coréen","Un sport","Un plat coréen","Une coupe de cheveux"]'::jsonb, 0, 'La K-pop (Korean Pop) est la pop coréenne. Des groupes comme BTS ou Blackpink ont une renommée mondiale et des fans très engagés.'),
('culture_pop', 'difficile', 'Quel groupe de K-pop a fait une tournée mondiale historique en 2019 ?', '["BTS","One Direction","Maroon 5","Coldplay"]'::jsonb, 0, 'BTS, groupe coréen de 7 membres, est devenu le plus grand groupe de K-pop au monde, avec une fanbase appelée "ARMY".'),
('culture_pop', 'facile', 'Quel rappeur français a fait un duo avec Beyoncé ?', '["PNL","Booba","Aya Nakamura","Damso"]'::jsonb, 2, 'Aya Nakamura a chanté avec Beyoncé sur "MOOD 4 EVA" en 2019, prouvant son rayonnement international.'),
('culture_pop', 'moyen', 'Qui chante "As It Was" (tube de 2022) ?', '["Justin Bieber","Harry Styles","Ed Sheeran","Bruno Mars"]'::jsonb, 1, 'Harry Styles, ancien membre du groupe One Direction, a connu un immense succès solo avec "As It Was", numéro 1 mondial en 2022.'),
('culture_pop', 'difficile', 'Quel film a battu tous les records au box-office en 2023 ?', '["Avatar 2","Barbie","Oppenheimer","Mission Impossible"]'::jsonb, 1, 'Le film "Barbie" de Greta Gerwig a été un phénomène mondial en 2023 avec plus de 1,4 milliard de dollars de recettes.'),
('culture_pop', 'moyen', 'Que regardent les fans sur Twitch principalement ?', '["Des recettes de cuisine","Des streamers (jeux vidéo, discussions)","Des films","Des dessins animés"]'::jsonb, 1, 'Twitch est une plateforme de diffusion en direct où les streamers jouent à des jeux, discutent ou créent du contenu. Très populaire chez les 15-30 ans.'),
('culture_pop', 'difficile', 'Qui est Squeezie ?', '["Un chanteur","Le youtubeur français le plus suivi","Un footballeur","Un acteur"]'::jsonb, 1, 'Squeezie (Lucas Hauchard) est le youtubeur français le plus suivi avec plus de 19 millions d''abonnés. Il organise notamment le GP Explorer.'),
('culture_pop', 'moyen', 'Qu''est-ce que le GP Explorer ?', '["Un voyage","Une course de F4 entre influenceurs","Un concours de cuisine","Un nouveau jeu"]'::jsonb, 1, 'Le GP Explorer, créé par Squeezie, est un Grand Prix de Formule 4 disputé par des influenceurs. Édition 2022 et 2023, il a rassemblé des millions de spectateurs.'),
('culture_pop', 'facile', 'Quelle chanteuse a sorti l''album "Midnights" en 2022 ?', '["Adele","Taylor Swift","Rihanna","Lady Gaga"]'::jsonb, 1, 'Taylor Swift a sorti "Midnights" en octobre 2022. C''est une des artistes les plus puissantes au monde, sa tournée "Eras Tour" a été un événement planétaire.'),
('culture_pop', 'moyen', 'Quel jeu mobile japonais a fait fureur avec ses créatures à attraper ?', '["Pokémon GO","Candy Crush","Among Us","Clash of Clans"]'::jsonb, 0, 'Pokémon GO (sorti en 2016) utilise la réalité augmentée : on attrape des Pokémon en se déplaçant dans la vraie vie avec son téléphone.'),
('culture_pop', 'difficile', 'Qui chante "Flowers" (succès 2023) ?', '["Miley Cyrus","Ariana Grande","Selena Gomez","Olivia Rodrigo"]'::jsonb, 0, 'Miley Cyrus a connu un immense succès avec "Flowers" début 2023, une chanson sur l''amour de soi qui a battu plusieurs records de streaming.'),
('culture_pop', 'moyen', 'Qu''est-ce qu''un "meme" ?', '["Un objet ancien","Une image ou vidéo humoristique partagée massivement","Un jeu de société","Une recette"]'::jsonb, 1, 'Un "meme" est un contenu humoristique (image, vidéo, expression) qui se propage rapidement sur Internet, souvent décliné de mille façons.'),
('culture_pop', 'facile', 'Quelle plateforme de streaming musical a un logo vert ?', '["Apple Music","Spotify","Deezer","YouTube Music"]'::jsonb, 1, 'Spotify, créé en Suède en 2008, est la plateforme de streaming musical la plus utilisée au monde. Son logo vert est mondialement reconnu.');

-- TECH
INSERT INTO public.questions (theme, difficulty, question, choices, correct_index, explanation) VALUES
('tech', 'facile', 'Qu''est-ce que ChatGPT ?', '["Un jeu vidéo","Une intelligence artificielle qui répond à vos questions","Un réseau social","Une appli de musique"]'::jsonb, 1, 'ChatGPT est une intelligence artificielle créée par OpenAI (lancée fin 2022). Elle peut répondre à des questions, écrire des textes, aider à programmer, etc.'),
('tech', 'facile', 'Que veut dire "IA" ?', '["Internet Avancé","Intelligence Artificielle","Image Animée","Idée Active"]'::jsonb, 1, 'IA = Intelligence Artificielle. Ce sont des programmes capables de simuler certains aspects de l''intelligence humaine (apprentissage, raisonnement).'),
('tech', 'facile', 'Que veut dire "Wi-Fi" ?', '["Une connexion Internet sans fil","Un type de musique","Un téléphone","Un ordinateur"]'::jsonb, 0, 'Le Wi-Fi est une technologie qui permet de connecter des appareils à Internet sans utiliser de câble, par ondes radio.'),
('tech', 'moyen', 'Que fait un "QR code" ?', '["Il chiffre une page","Scanné, il ouvre un lien ou affiche une info","Il sert à payer uniquement","Il appelle quelqu''un"]'::jsonb, 1, 'Un QR code est un carré rempli de petits motifs noirs et blancs. En le scannant avec son téléphone, on accède à un site, un menu, une info...'),
('tech', 'facile', 'Que fait-on avec FaceTime ?', '["On joue à un jeu","On passe un appel vidéo (Apple)","On écrit un livre","On regarde un film"]'::jsonb, 1, 'FaceTime est l''application d''Apple pour passer des appels vidéo gratuits entre appareils Apple (iPhone, iPad, Mac).'),
('tech', 'moyen', 'Que signifie "le cloud" ?', '["Un nuage dans le ciel","Stocker ses fichiers sur Internet","Un nouveau téléphone","Un jeu vidéo"]'::jsonb, 1, 'Le "cloud" (nuage en anglais) désigne le stockage de fichiers sur des serveurs Internet, accessibles partout. Exemples : iCloud, Google Drive, Dropbox.'),
('tech', 'facile', 'Que veut dire "scroller" ?', '["Faire défiler une page","Éteindre l''appareil","Faire un appel","Prendre une photo"]'::jsonb, 0, '"Scroller" vient de l''anglais "to scroll" : faire défiler une page (vers le haut ou le bas) avec son doigt sur un écran tactile.'),
('tech', 'moyen', 'Qu''est-ce qu''une "appli" ?', '["Un logiciel installé sur un téléphone","Un type de musique","Un appareil photo","Un journal"]'::jsonb, 0, 'Une "appli" (application) est un logiciel installé sur un smartphone, une tablette ou un ordinateur, permettant d''accomplir une tâche précise.'),
('tech', 'facile', 'À quoi sert le "mode avion" ?', '["À prendre l''avion","À couper toutes les connexions","À voir des avions","À voyager"]'::jsonb, 1, 'Le "mode avion" coupe toutes les connexions sans fil (Wi-Fi, données, Bluetooth) du téléphone. Obligatoire en avion, utile pour économiser la batterie.'),
('tech', 'moyen', 'Que faire face à un email suspect demandant vos infos bancaires ?', '["Répondre rapidement","Ne pas cliquer et le supprimer","Donner ses informations","Le transférer à des amis"]'::jsonb, 1, 'C''est probablement du "phishing" (hameçonnage) : ne JAMAIS cliquer sur les liens ni donner d''infos. Supprimez le message ou signalez-le.'),
('tech', 'difficile', 'Qu''est-ce que le "phishing" ?', '["Une technique de pêche","Une arnaque pour voler vos données","Un nouveau réseau","Un jeu en ligne"]'::jsonb, 1, 'Le "phishing" (ou hameçonnage) est une arnaque : on reçoit un faux message imitant une banque ou un service connu pour voler nos identifiants ou coordonnées.'),
('tech', 'moyen', 'Quel geste agrandit l''image sur un écran tactile ?', '["Taper deux fois","Écarter deux doigts","Secouer le téléphone","Pencher l''écran"]'::jsonb, 1, 'Pour zoomer, on écarte deux doigts (généralement le pouce et l''index) sur l''écran tactile. Pour dézoomer, on les rapproche.'),
('tech', 'facile', 'Que veut dire "MAJ" sur un téléphone ?', '["Majuscule","Mise à jour","Magasin","Maladie"]'::jsonb, 1, 'MAJ = Mise À Jour. C''est l''installation d''une nouvelle version d''une application ou du système, qui apporte des améliorations et corrections.'),
('tech', 'moyen', 'Pourquoi faut-il mettre à jour ses applications ?', '["Pour le plaisir","Pour la sécurité et avoir les nouveautés","C''est obligatoire","Pour économiser la batterie"]'::jsonb, 1, 'Les mises à jour corrigent des failles de sécurité (très important !) et apportent de nouvelles fonctionnalités. Il est conseillé de les installer régulièrement.'),
('tech', 'facile', 'Que fait-on avec Google Maps ?', '["On joue à un jeu","On trouve son chemin","On écrit un livre","On écoute de la musique"]'::jsonb, 1, 'Google Maps est une application de cartographie : trajets, navigation GPS, transports en commun, lieux à proximité, vue satellite, etc.'),
('tech', 'moyen', 'Qu''est-ce qu''un mot de passe "fort" ?', '["Un mot court et simple","Long, mêlant lettres, chiffres et symboles","Le nom de son chien","La date de naissance"]'::jsonb, 1, 'Un mot de passe fort fait au moins 12 caractères, mélange majuscules, minuscules, chiffres et symboles. Ne jamais utiliser des infos personnelles évidentes.'),
('tech', 'difficile', 'Qu''est-ce qu''un VPN ?', '["Un type d''écran","Un service qui chiffre votre connexion Internet","Un nouveau téléphone","Un virus"]'::jsonb, 1, 'Un VPN (Virtual Private Network) protège votre vie privée en ligne en chiffrant votre connexion et masquant votre adresse IP réelle.'),
('tech', 'moyen', 'Qu''est-ce que la 5G ?', '["Une nouvelle voiture","La 5e génération de réseau mobile (très rapide)","Un nouveau téléphone","Un jeu vidéo"]'::jsonb, 1, 'La 5G est la cinquième génération de réseau mobile, succédant à la 4G. Elle offre un débit beaucoup plus rapide et une meilleure réactivité.'),
('tech', 'facile', 'Que veut dire "télécharger" ?', '["Effacer un fichier","Récupérer un fichier depuis Internet","Envoyer un email","Imprimer"]'::jsonb, 1, '"Télécharger" signifie copier un fichier depuis Internet vers son appareil (téléphone, ordinateur). À l''inverse, "envoyer" un fichier sur Internet = "uploader".'),
('tech', 'moyen', 'À quoi sert la "double authentification" ?', '["À envoyer 2 mails","À sécuriser un compte avec 2 vérifications","À avoir 2 comptes","À doubler la batterie"]'::jsonb, 1, 'La double authentification (ou "2FA") demande 2 preuves d''identité : votre mot de passe + un code envoyé sur votre téléphone. Très efficace contre le piratage.'),
('tech', 'difficile', 'Qu''est-ce qu''un "deepfake" ?', '["Un jeu vidéo","Une fausse vidéo très réaliste créée par IA","Un effet sonore","Un nouveau réseau"]'::jsonb, 1, 'Un "deepfake" est une vidéo truquée par intelligence artificielle, capable de faire dire ou faire à quelqu''un des choses qu''il n''a jamais dites. Risque important de désinformation.'),
('tech', 'moyen', 'Qui a créé l''iPhone ?', '["Microsoft","Apple","Samsung","Google"]'::jsonb, 1, 'L''iPhone a été créé par Apple, présenté par Steve Jobs en 2007. Il a révolutionné le téléphone mobile en démocratisant l''écran tactile.'),
('tech', 'facile', 'Que veut dire "OS" sur un téléphone ?', '["Old School","Système d''exploitation","Open Source","Outil Spécial"]'::jsonb, 1, 'OS = Operating System (système d''exploitation). C''est le logiciel principal du téléphone (iOS pour Apple, Android pour les autres).'),
('tech', 'moyen', 'Que veut dire "Bluetooth" ?', '["Une couleur de dent","Une connexion sans fil entre appareils proches","Un type d''écran","Une marque de téléphone"]'::jsonb, 1, 'Le Bluetooth est une technologie de connexion sans fil à courte distance, utilisée pour relier des appareils (écouteurs, voiture, enceinte) entre eux.');
