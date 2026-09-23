/**
 * English Kha Master — Core Curriculum & Lesson Database
 * Pre-seeded comprehensive lessons across all cards:
 * - Tiểu học: Lớp 1, Lớp 2, Lớp 3, Lớp 4, Lớp 5 (Reading & Listening)
 * - IELTS: A1 (1.0-2.5), A2 (3.0-3.5), B1 (4.0-5.0), B2 (5.5-6.5), C1 (7.0-8.0), C2 (8.5-9.0) (Reading & Listening)
 */

const CURRICULUM_DATA = {
  tieuhoc: [
    // ── LỚP 1 ──
    {
      id: 'th_lop1_read',
      mode: 'tieuhoc',
      grade: '1',
      skill: 'reading',
      title: 'Lớp 1: Alphabet Fun & Friendly Animals',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Giáo dục',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Hello! Welcome to English class. Look at the animals! An apple is red and sweet. A bird can fly high in the blue sky. A cat likes to play with a small ball of wool. A dog is friendly and loves to run in the park. Animals are our good friends.',
      summary: 'Bài đọc vui nhộn giúp học sinh Lớp 1 làm quen với bảng chữ cái tiếng Anh (A, B, C, D) và tên các con vật quen thuộc như chim, mèo, chó.',
      vocab: [
        { word: 'Apple', meaning: 'quả táo (n)' },
        { word: 'Bird', meaning: 'con chim (n)' },
        { word: 'Cat', meaning: 'con mèo (n)' },
        { word: 'Dog', meaning: 'con chó (n)' },
        { word: 'Friendly', meaning: 'thân thiện, đáng yêu (adj)' }
      ],
      quiz: [
        { question: 'What color is the apple in the story?', options: ['Red (Đỏ)', 'Green (Xanh lá)', 'Yellow (Vàng)', 'Blue (Xanh dương)'], correct: 0 },
        { question: 'What can the bird do?', options: ['Fly high in the sky', 'Swim in the river', 'Bark at night', 'Read a book'], correct: 0 },
        { question: 'Which animal likes to play with a small ball?', options: ['A cat', 'A bird', 'An elephant', 'A fish'], correct: 0 },
        { question: 'Where does the dog love to run?', options: ['In the park', 'In the kitchen', 'Under the bed', 'On the roof'], correct: 0 },
        { question: 'Animals are our good...', options: ['Friends', 'Books', 'Toys', 'Schools'], correct: 0 }
      ],
      likes: 15,
      comments: [{ id: 'c1', author: 'Bé Minh Anh', text: 'Con thích bài học về con mèo và chú cún lắm ạ!', date: 'Vừa xong' }]
    },
    {
      id: 'th_lop1_listen',
      mode: 'tieuhoc',
      grade: '1',
      skill: 'listening',
      title: 'Lớp 1: Colors & Numbers All Around Us',
      creator: 'Cô Mai Lan',
      creatorId: 'u_admin',
      tag: 'Gia đình',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Listen carefully! One, two, three, four, five! I have one blue backpack. I have two yellow pencils. I have three red apples on the table. How many balloons do you see? I see four purple balloons and five green books.',
      summary: 'Bài luyện nghe đếm số từ 1 đến 5 kết hợp nhận biết các màu sắc cơ bản (xanh dương, vàng, đỏ, tím, xanh lá).',
      vocab: [
        { word: 'Backpack', meaning: 'ba lô đi học (n)' },
        { word: 'Yellow', meaning: 'màu vàng (adj/n)' },
        { word: 'Pencils', meaning: 'những cây bút chì (n)' },
        { word: 'Balloons', meaning: 'những quả bóng bay (n)' },
        { word: 'Purple', meaning: 'màu tím (adj/n)' }
      ],
      quiz: [
        { question: 'How many blue backpacks are there?', options: ['One (1)', 'Two (2)', 'Three (3)', 'Four (4)'], correct: 0 },
        { question: 'What color are the two pencils?', options: ['Yellow', 'Red', 'Blue', 'Black'], correct: 0 },
        { question: 'How many apples are on the table?', options: ['Three (3)', 'Two (2)', 'Five (5)', 'Four (4)'], correct: 0 },
        { question: 'What color are the balloons?', options: ['Purple', 'Orange', 'Brown', 'Pink'], correct: 0 },
        { question: 'How many green books are mentioned?', options: ['Five (5)', 'Six (6)', 'One (1)', 'Three (3)'], correct: 0 }
      ],
      likes: 11,
      comments: []
    },

    // ── LỚP 2 ──
    {
      id: 'th_lop2_read',
      mode: 'tieuhoc',
      grade: '2',
      skill: 'reading',
      title: 'Lớp 2: My Wonderful Family & Sunny Morning',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Gia đình',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Good morning! My name is Nam. I live in a lovely home with my family. My father is tall and kind. He is an engineer. My mother has a warm smile and cooks delicious meals. My sister Linh is six years old. We love eating breakfast together every Sunday morning.',
      summary: 'Đoạn văn giới thiệu các thành viên trong gia đình bạn Nam và những khoảnh khắc ấm áp cùng ăn sáng vào mỗi sáng Chủ nhật.',
      vocab: [
        { word: 'Engineer', meaning: 'kỹ sư (n)' },
        { word: 'Delicious', meaning: 'ngon miệng, thơm ngon (adj)' },
        { word: 'Breakfast', meaning: 'bữa ăn sáng (n)' },
        { word: 'Together', meaning: 'cùng nhau (adv)' },
        { word: 'Smile', meaning: 'nụ cười (n/v)' }
      ],
      quiz: [
        { question: 'Who is telling the story?', options: ['Nam', 'Linh', 'The father', 'The teacher'], correct: 0 },
        { question: 'What is the father\'s job?', options: ['Engineer', 'Doctor', 'Pilot', 'Chef'], correct: 0 },
        { question: 'How old is Nam\'s sister Linh?', options: ['Six years old (6)', 'Eight years old (8)', 'Ten years old (10)', 'Four years old (4)'], correct: 0 },
        { question: 'What does the family love doing every Sunday morning?', options: ['Eating breakfast together', 'Going swimming', 'Playing soccer', 'Cleaning garden'], correct: 0 },
        { question: 'How is the mother described?', options: ['Has a warm smile & cooks well', 'Strict & quiet', 'Very tall & athletic', 'Busy in office'], correct: 0 }
      ],
      likes: 18,
      comments: []
    },
    {
      id: 'th_lop2_listen',
      mode: 'tieuhoc',
      grade: '2',
      skill: 'listening',
      title: 'Lớp 2: A Sunny Day at the City Zoo',
      creator: 'Cô Mai Lan',
      creatorId: 'u_admin',
      tag: 'Môi trường',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Today is Saturday. The weather is sunny and bright. Tony visits the city zoo with his classmates. Look at the tall giraffes eating green leaves from tall trees! The funny monkeys are jumping between branches. A baby elephant is drinking water happily.',
      summary: 'Bài nghe miêu tả chuyến tham quan vườn thú sôi động vào ngày thứ Bảy ngập nắng cùng hươu cao cổ, khỉ và chú voi con.',
      vocab: [
        { word: 'Giraffe', meaning: 'hươu cao cổ (n)' },
        { word: 'Branch', meaning: 'cành cây (n)' },
        { word: 'Elephant', meaning: 'con voi (n)' },
        { word: 'Classmates', meaning: 'bạn cùng lớp (n)' },
        { word: 'Happily', meaning: 'một cách vui vẻ, hân hoan (adv)' }
      ],
      quiz: [
        { question: 'What day is it today?', options: ['Saturday (Thứ Bảy)', 'Monday (Thứ Hai)', 'Friday (Thứ Sáu)', 'Wednesday (Thứ Tư)'], correct: 0 },
        { question: 'Who goes to the zoo with Tony?', options: ['His classmates', 'His cousins', 'His grandparents', 'His neighbor'], correct: 0 },
        { question: 'What are the giraffes doing?', options: ['Eating green leaves', 'Sleeping under tree', 'Running fast', 'Swimming in pool'], correct: 0 },
        { question: 'Which animals are jumping between branches?', options: ['Monkeys', 'Birds', 'Lions', 'Bears'], correct: 0 },
        { question: 'What is the baby elephant doing?', options: ['Drinking water happily', 'Eating bananas', 'Playing with ball', 'Taking a nap'], correct: 0 }
      ],
      likes: 14,
      comments: []
    },

    // ── LỚP 3 ──
    {
      id: 'th_lop3_read',
      mode: 'tieuhoc',
      grade: '3',
      skill: 'reading',
      title: 'Lớp 3: School Routine & Favorite Subjects',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Giáo dục',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'My school starts at half past seven in the morning. We study five periods each day. My favorite subject is English because I can sing English songs and learn new vocabulary. In the afternoon, we have Science and Art. During break time, my friends and I love playing shuttlecock in the schoolyard.',
      summary: 'Đoạn văn kể về thời gian biểu học tập tại trường tiểu học, niềm yêu thích môn tiếng Anh và các trò chơi giờ ra chơi.',
      vocab: [
        { word: 'Period', meaning: 'tiết học (n)' },
        { word: 'Subject', meaning: 'môn học (n)' },
        { word: 'Shuttlecock', meaning: 'quả cầu / trò đá cầu (n)' },
        { word: 'Schoolyard', meaning: 'sân trường (n)' },
        { word: 'Break time', meaning: 'giờ ra chơi (n)' }
      ],
      quiz: [
        { question: 'What time does school start?', options: ['7:30 AM (Bảy rưỡi sáng)', '8:00 AM', '6:45 AM', '7:00 AM'], correct: 0 },
        { question: 'How many periods do students study each day?', options: ['Five periods (5)', 'Four periods (4)', 'Six periods (6)', 'Seven periods (7)'], correct: 0 },
        { question: 'Why is English the favorite subject?', options: ['Can sing songs & learn vocab', 'It is very easy', 'Teacher gives no homework', 'Has no exams'], correct: 0 },
        { question: 'Which subjects are in the afternoon?', options: ['Science and Art', 'Math and History', 'Music and PE', 'Geography'], correct: 0 },
        { question: 'What game do they play in the schoolyard?', options: ['Shuttlecock (Đá cầu)', 'Hide and seek', 'Chess', 'Basketball'], correct: 0 }
      ],
      likes: 22,
      comments: [{ id: 'c2', author: 'Tuấn Kiệt', text: 'Bài này rất sát với chương trình SGK lớp 3!', date: 'Hôm qua' }]
    },
    {
      id: 'th_lop3_listen',
      mode: 'tieuhoc',
      grade: '3',
      skill: 'listening',
      title: 'Lớp 3: Healthy Food & Fresh Drinks',
      creator: 'Cô Mai Lan',
      creatorId: 'u_admin',
      tag: 'Gia đình',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Eating healthy food keeps our bodies strong and energetic. Every day, doctors recommend drinking plenty of fresh water and milk. Eating fresh fruits such as oranges, bananas, and apples provides important vitamins. Remember to eat lots of green vegetables with fish and rice for lunch!',
      summary: 'Bài nghe về chế độ dinh dưỡng lành mạnh, tầm quan trọng của nước lọc, sữa, trái cây và rau xanh đối với sức khỏe học sinh.',
      vocab: [
        { word: 'Energetic', meaning: 'tràn đầy năng lượng (adj)' },
        { word: 'Recommend', meaning: 'khuyên nhủ, đề xuất (v)' },
        { word: 'Vitamins', meaning: 'các loại vitamin (n)' },
        { word: 'Vegetables', meaning: 'rau củ quả (n)' },
        { word: 'Healthy', meaning: 'lành mạnh, bổ dưỡng (adj)' }
      ],
      quiz: [
        { question: 'What does eating healthy food do for our bodies?', options: ['Keeps us strong and energetic', 'Makes us sleepy', 'Makes us run slower', 'Causes stomachache'], correct: 0 },
        { question: 'What drinks do doctors recommend every day?', options: ['Fresh water and milk', 'Soda and cola', 'Iced coffee', 'Sugary tea'], correct: 0 },
        { question: 'Which fruits are mentioned in the text?', options: ['Oranges, bananas, and apples', 'Grapes and watermelons', 'Mangoes and papayas', 'Strawberries'], correct: 0 },
        { question: 'What provides important vitamins?', options: ['Fresh fruits', 'Potato chips', 'Candy bars', 'Fast food'], correct: 0 },
        { question: 'What should we eat with fish and rice for lunch?', options: ['Lots of green vegetables', 'Fried chicken', 'Chocolate cake', 'Ice cream'], correct: 0 }
      ],
      likes: 12,
      comments: []
    },

    // ── LỚP 4 ──
    {
      id: 'th_lop4_read',
      mode: 'tieuhoc',
      grade: '4',
      skill: 'reading',
      title: 'Lớp 4: Weekend Adventures in the Countryside',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Môi trường',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Last weekend, my parents took my brother and me to our grandparents\' farmhouse in the countryside. The air was cool and fresh, far away from noisy city traffic. We rode bicycles along peaceful village roads bordered by golden rice fields. In the afternoon, we flew colorful kites with local children beside the calm river.',
      summary: 'Chuyến về thăm quê đầy thú vị: đạp xe trên đường làng rợp bóng lúa chín và thả diều cùng bạn nhỏ bên bờ sông êm đềm.',
      vocab: [
        { word: 'Countryside', meaning: 'vùng nông thôn, làng quê (n)' },
        { word: 'Traffic', meaning: 'giao thông, xe cộ (n)' },
        { word: 'Bordered', meaning: 'được bao quanh bởi (adj/v)' },
        { word: 'Peaceful', meaning: 'thanh bình, yên ả (adj)' },
        { word: 'Adventure', meaning: 'chuyến phiêu lưu (n)' }
      ],
      quiz: [
        { question: 'Where did the family go last weekend?', options: ['Grandparents\' farmhouse in countryside', 'A crowded amusement park', 'A seaside resort', 'A mountain hotel'], correct: 0 },
        { question: 'How was the air in the countryside described?', options: ['Cool and fresh', 'Hot and dusty', 'Smoky and foggy', 'Freezing and dark'], correct: 0 },
        { question: 'What did the children ride along the village roads?', options: ['Bicycles', 'Motorbikes', 'Horses', 'Skateboards'], correct: 0 },
        { question: 'What bordered the village roads?', options: ['Golden rice fields', 'Tall skyscrapers', 'Concrete walls', 'Train tracks'], correct: 0 },
        { question: 'What activity did they enjoy in the afternoon?', options: ['Flying colorful kites', 'Catching butterflies', 'Watching TV', 'Sleeping in tent'], correct: 0 }
      ],
      likes: 19,
      comments: []
    },
    {
      id: 'th_lop4_listen',
      mode: 'tieuhoc',
      grade: '4',
      skill: 'listening',
      title: 'Lớp 4: Favorite Sports and Outdoor Activities',
      creator: 'Cô Mai Lan',
      creatorId: 'u_admin',
      tag: 'Giáo dục',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Regular physical activity is vital for primary students. Swimming improves breathing and muscle strength. Playing football teaches teamwork, communication, and discipline. Badminton helps sharpen reflexes and hand-eye coordination. Joining a school sports club is a great way to make lifelong friends.',
      summary: 'Bài luyện nghe về lợi ích của các môn thể thao: bơi lội, bóng đá, cầu lông và phát triển kỹ năng làm việc nhóm.',
      vocab: [
        { word: 'Physical', meaning: 'thuộc về thể chất (adj)' },
        { word: 'Teamwork', meaning: 'tinh thần đồng đội (n)' },
        { word: 'Discipline', meaning: 'kỷ luật (n)' },
        { word: 'Reflexes', meaning: 'phản xạ (n)' },
        { word: 'Coordination', meaning: 'sự phối hợp vận động (n)' }
      ],
      quiz: [
        { question: 'What does swimming improve?', options: ['Breathing and muscle strength', 'Typing speed', 'Math skills', 'Eyesight in dark'], correct: 0 },
        { question: 'What does playing football teach students?', options: ['Teamwork, communication & discipline', 'How to fly a kite', 'Drawing techniques', 'Cooking rules'], correct: 0 },
        { question: 'Which sport helps sharpen reflexes and coordination?', options: ['Badminton', 'Reading', 'Singing', 'Playing video games'], correct: 0 },
        { question: 'What is a great benefit of joining a school sports club?', options: ['Making lifelong friends', 'Getting free soda', 'Skipping all classes', 'Sleeping longer'], correct: 0 },
        { question: 'Why is physical exercise vital for students?', options: ['For overall health and development', 'To become famous', 'To buy new shoes', 'To stay indoors'], correct: 0 }
      ],
      likes: 16,
      comments: []
    },

    // ── LỚP 5 ──
    {
      id: 'th_lop5_read',
      mode: 'tieuhoc',
      grade: '5',
      skill: 'reading',
      title: 'Lớp 5: Protecting Our Environment and Oceans',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Môi trường',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Our planet Earth is facing severe environmental problems, especially plastic pollution in rivers and oceans. Millions of tons of single-use plastic bags and bottles harm marine creatures like sea turtles and whales. Students can help by adopting the 3Rs rule: Reduce, Reuse, and Recycle. Bringing reusable cloth bags and planting more trees will create a greener future.',
      summary: 'Bài học nâng cao ý thức bảo vệ môi trường, hạn chế rác thải nhựa và áp dụng quy tắc 3R (Giảm thiểu, Tái sử dụng, Tái chế).',
      vocab: [
        { word: 'Pollution', meaning: 'sự ô nhiễm (n)' },
        { word: 'Single-use', meaning: 'dùng một lần (adj)' },
        { word: 'Marine', meaning: 'thuộc về biển cả, đại dương (adj)' },
        { word: 'Recycle', meaning: 'tái chế (v)' },
        { word: 'Reusable', meaning: 'có thể tái sử dụng nhiều lần (adj)' }
      ],
      quiz: [
        { question: 'What environmental problem is highlighted in the text?', options: ['Plastic pollution in rivers and oceans', 'Too much noise in libraries', 'Lack of playgrounds', 'Heavy snow in deserts'], correct: 0 },
        { question: 'Which marine animals are harmed by plastic waste?', options: ['Sea turtles and whales', 'Giraffes and lions', 'Pigeons and sparrows', 'Camels and horses'], correct: 0 },
        { question: 'What does the 3Rs rule stand for?', options: ['Reduce, Reuse, and Recycle', 'Read, Remember, and Repeat', 'Run, Race, and Rest', 'Ride, Repair, and Replace'], correct: 0 },
        { question: 'What should students bring instead of plastic bags?', options: ['Reusable cloth bags', 'Paper boxes only', 'Plastic baskets', 'Metal cans'], correct: 0 },
        { question: 'What action helps create a greener future?', options: ['Planting more trees & reducing waste', 'Buying more plastic toys', 'Leaving lights on all night', 'Throwing bottles in rivers'], correct: 0 }
      ],
      likes: 25,
      comments: [{ id: 'c3', author: 'Bảo Châu', text: 'Chủ đề môi trường rất ý nghĩa cho bài thi học kỳ!', date: 'Hôm nay' }]
    },
    {
      id: 'th_lop5_listen',
      mode: 'tieuhoc',
      grade: '5',
      skill: 'listening',
      title: 'Lớp 5: Exploring Wonders of the Solar System',
      creator: 'Cô Mai Lan',
      creatorId: 'u_admin',
      tag: 'Công nghệ',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'The solar system is an extraordinary family of celestial bodies. At the center is the Sun, an enormous star that radiates light and heat. Eight planets orbit around the Sun, with Earth being the third planet and the only one known to sustain life. Scientists use powerful space telescopes and robotic rovers to explore Mars and distant moons.',
      summary: 'Khám phá Hệ Mặt Trời kỳ vĩ: Mặt Trời ở trung tâm, 8 hành tinh quay quanh và các tàu thám hiểm không gian trên Sao Hỏa.',
      vocab: [
        { word: 'Solar system', meaning: 'Hệ Mặt Trời (n)' },
        { word: 'Celestial', meaning: 'thuộc về thiên thể không gian (adj)' },
        { word: 'Orbit', meaning: 'quay theo quỹ đạo (v/n)' },
        { word: 'Sustain', meaning: 'duy trì, nuôi dưỡng sự sống (v)' },
        { word: 'Telescopes', meaning: 'kính viễn vọng thiên văn (n)' }
      ],
      quiz: [
        { question: 'What celestial body is at the center of the solar system?', options: ['The Sun', 'The Moon', 'Mars', 'Jupiter'], correct: 0 },
        { question: 'How many planets orbit around the Sun?', options: ['Eight (8)', 'Nine (9)', 'Seven (7)', 'Ten (10)'], correct: 0 },
        { question: 'Which planet is the third from the Sun and sustains life?', options: ['Earth', 'Venus', 'Mars', 'Mercury'], correct: 0 },
        { question: 'What tools do scientists use to explore space?', options: ['Space telescopes and robotic rovers', 'Binoculars and mirrors', 'Flashlights and drones', 'Submarines'], correct: 0 },
        { question: 'Which planet is actively explored with robotic rovers?', options: ['Mars (Sao Hỏa)', 'Saturn (Sao Thổ)', 'Neptune (Sao Hải Vương)', 'Uranus (Sao Thiên Vương)'], correct: 0 }
      ],
      likes: 17,
      comments: []
    }
  ],

  ielts: [
    // ── BAND A1 ──
    {
      id: 'ielts_a1_read',
      mode: 'ielts',
      level: 'A1',
      skill: 'reading',
      title: 'IELTS A1: Daily Life and Family Routine in Hanoi',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Gia đình',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Lan lives with her parents in a quiet street in Hanoi. Every morning, she wakes up at six o\'clock, prepares a light breakfast, and rides her bicycle to university. Her father works at an international trading company, and her mother teaches mathematics at high school. In the evenings, they gather to prepare traditional Vietnamese dinners and discuss their daily activities.',
      summary: 'Bài đọc cấp độ sơ cấp A1 (IELTS 1.0 - 2.5) miêu tả sinh hoạt thường nhật, thói quen đi học và không khí gia đình ấm cúng tại Hà Nội.',
      vocab: [
        { word: 'Routine', meaning: 'thói quen sinh hoạt thường nhật (n)' },
        { word: 'Prepares', meaning: 'chuẩn bị, sửa soạn (v)' },
        { word: 'International', meaning: 'mang tính quốc tế (adj)' },
        { word: 'Gather', meaning: 'tụ họp, sum vầy bên nhau (v)' },
        { word: 'Traditional', meaning: 'mang tính truyền thống (adj)' }
      ],
      quiz: [
        { question: 'What time does Lan wake up each morning?', options: ['6:00 AM (6 giờ sáng)', '7:00 AM', '5:30 AM', '8:00 AM'], correct: 0 },
        { question: 'How does Lan travel to her university?', options: ['By bicycle', 'By bus', 'By motorbike', 'On foot'], correct: 0 },
        { question: 'What subject does Lan\'s mother teach?', options: ['Mathematics', 'English', 'History', 'Physics'], correct: 0 },
        { question: 'Where does her father work?', options: ['At an international trading company', 'At a local hospital', 'In a restaurant', 'In a bank'], correct: 0 },
        { question: 'What does the family do together in the evenings?', options: ['Prepare dinner and discuss their day', 'Watch movies until late', 'Go to the gym', 'Work overtime'], correct: 0 }
      ],
      likes: 14,
      comments: []
    },
    {
      id: 'ielts_a1_listen',
      mode: 'ielts',
      level: 'A1',
      skill: 'listening',
      title: 'IELTS A1: Meeting New Friends at English Language Club',
      creator: 'Thầy Viết Kha',
      creatorId: 'u_admin',
      tag: 'Giáo dục',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Welcome to the Sunday English Club! My name is David, and I am from Sydney, Australia. I am studying Asian history and learning Vietnamese. In my free time, I enjoy reading historical novels, cooking spicy dishes, and hiking in the mountains. We meet every weekend to practice conversational English and share cultural stories.',
      summary: 'Đoạn hội thoại giới thiệu bản thân, sở thích cá nhân và mục tiêu luyện tập giao tiếp tiếng Anh của du học sinh tại câu lạc bộ.',
      vocab: [
        { word: 'Conversational', meaning: 'mang tính giao tiếp, đàm thoại (adj)' },
        { word: 'Novels', meaning: 'tiểu thuyết (n)' },
        { word: 'Culture', meaning: 'nền văn hóa (n)' },
        { word: 'Weekend', meaning: 'ngày cuối tuần (n)' },
        { word: 'Practice', meaning: 'luyện tập, thực hành (v/n)' }
      ],
      quiz: [
        { question: 'Where is David from?', options: ['Sydney, Australia', 'London, UK', 'New York, USA', 'Toronto, Canada'], correct: 0 },
        { question: 'What is David studying?', options: ['Asian history', 'Medicine', 'Computer science', 'Civil engineering'], correct: 0 },
        { question: 'What does David like doing in his free time?', options: ['Reading novels, cooking & hiking', 'Playing video games', 'Sleeping all day', 'Fixing motorbikes'], correct: 0 },
        { question: 'How often does the English Club meet?', options: ['Every weekend', 'Every Wednesday', 'Once a month', 'Every morning'], correct: 0 },
        { question: 'What is the main goal of the club members?', options: ['Practice speaking & share stories', 'Take grammar tests', 'Sell books', 'Sing karaoke'], correct: 0 }
      ],
      likes: 9,
      comments: []
    },

    // ── BAND A2 ──
    {
      id: 'ielts_a2_read',
      mode: 'ielts',
      level: 'A2',
      skill: 'reading',
      title: 'IELTS A2: Traditional Festivals & Tet Holiday in Vietnam',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Gia đình',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'The Lunar New Year, locally known as Tet, represents the most significant cultural celebration in Vietnam. Weeks prior to the holiday, families thoroughly clean and decorate their households with vibrant yellow apricot blossoms and pink peach flowers. Families cook traditional square sticky rice cakes called banh chung and exchange red envelopes containing lucky money to wish each other good health and prosperity.',
      summary: 'Bài đọc cấp độ A2 (IELTS 3.0 - 3.5) về phong tục đón Tết Nguyên Đán tại Việt Nam, bánh chưng và ý nghĩa phong bao lì xì may mắn.',
      vocab: [
        { word: 'Significant', meaning: 'quan trọng, có ý nghĩa lớn (adj)' },
        { word: 'Households', meaning: 'các hộ gia đình (n)' },
        { word: 'Blossoms', meaning: 'hoa nở rộ ngày xuân (n)' },
        { word: 'Prosperity', meaning: 'sự thịnh vượng, an khang (n)' },
        { word: 'Envelopes', meaning: 'phong bì, bao lì xì (n)' }
      ],
      quiz: [
        { question: 'What is Tet known as in English?', options: ['The Lunar New Year', 'Mid-Autumn Festival', 'Independence Day', 'Thanksgiving'], correct: 0 },
        { question: 'What flowers do families use to decorate their homes?', options: ['Apricot blossoms and peach flowers', 'Sunflowers and roses', 'Lilies and daisies', 'Tulips and orchids'], correct: 0 },
        { question: 'What traditional sticky rice cake is cooked for Tet?', options: ['Banh chung', 'Banh mi', 'Pho', 'Banh cuon'], correct: 0 },
        { question: 'What do red envelopes contain?', options: ['Lucky money wishing health & prosperity', 'Family photos', 'Written exams', 'Cooking recipes'], correct: 0 },
        { question: 'What do families do weeks before the festival?', options: ['Thoroughly clean and decorate homes', 'Travel abroad', 'Close all shops permanently', 'Sleep all day'], correct: 0 }
      ],
      likes: 21,
      comments: []
    },
    {
      id: 'ielts_a2_listen',
      mode: 'ielts',
      level: 'A2',
      skill: 'listening',
      title: 'IELTS A2: Planning a Scenic Trip to Ha Long Bay',
      creator: 'Thầy Viết Kha',
      creatorId: 'u_admin',
      tag: 'Môi trường',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Good afternoon, travelers! Today our travel agency is pleased to announce our weekend cruise package to Ha Long Bay, an official UNESCO World Heritage Site. The two-day cruise itinerary features visits to limestone caves, guided sea kayaking around emerald waters, and a seafood dinner prepared by top Vietnamese chefs. Early reservations include free transport from Hanoi.',
      summary: 'Thông tin chuyến du lịch vịnh Hạ Long: tham quan hang động đá vôi, chèo thuyền kayak và thưởng thức ẩm thực hải sản.',
      vocab: [
        { word: 'Heritage', meaning: 'di sản văn hóa/thiên nhiên (n)' },
        { word: 'Itinerary', meaning: 'lịch trình chi tiết chuyến đi (n)' },
        { word: 'Limestone', meaning: 'đá vôi (n)' },
        { word: 'Kayaking', meaning: 'chèo thuyền kayak (n)' },
        { word: 'Reservation', meaning: 'sự đặt chỗ trước (n)' }
      ],
      quiz: [
        { question: 'Where is the weekend cruise traveling to?', options: ['Ha Long Bay', 'Phu Quoc Island', 'Nha Trang Beach', 'Sapa Mountains'], correct: 0 },
        { question: 'What prestigious status does Ha Long Bay hold?', options: ['UNESCO World Heritage Site', 'National Forest', 'Theme Park', 'Private Reserve'], correct: 0 },
        { question: 'What outdoor activity is included in the emerald waters?', options: ['Sea kayaking', 'Scuba diving with sharks', 'Water skiing', 'Deep sea fishing'], correct: 0 },
        { question: 'How long is the cruise itinerary?', options: ['Two days (2 ngày)', 'Five days', 'One week', 'Three weeks'], correct: 0 },
        { question: 'What benefit do travelers get with early reservations?', options: ['Free transport from Hanoi', 'Free airplane tickets', 'Free camera', 'Free hotel in Da Nang'], correct: 0 }
      ],
      likes: 15,
      comments: []
    },

    // ── BAND B1 ──
    {
      id: 'ielts_b1_read',
      mode: 'ielts',
      level: 'B1',
      skill: 'reading',
      title: 'IELTS B1: The Influence of Social Media on Teenagers',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Công nghệ',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'In modern society, social networking platforms have revolutionized how adolescents communicate, learn, and maintain friendships. While these digital tools facilitate instant knowledge exchange and support global connectivity, psychologists voice increasing concern regarding digital addiction and reduced sleep quality. Excessive screen consumption often correlates with diminished concentration spans and heightened academic anxiety.',
      summary: 'Phân tích học thuật Band B1 (IELTS 4.0 - 5.0) về tác động của mạng xã hội đối với giới trẻ: kết nối tri thức nhanh chóng nhưng cũng tiềm ẩn nguy cơ nghiện thiết bị và giảm chú ý.',
      vocab: [
        { word: 'Revolutionized', meaning: 'tạo ra bước ngoặt cách mạng (v)' },
        { word: 'Adolescents', meaning: 'thanh thiếu niên (n)' },
        { word: 'Connectivity', meaning: 'khả năng kết nối (n)' },
        { word: 'Correlates', meaning: 'có mối tương quan trực tiếp (v)' },
        { word: 'Diminished', meaning: 'bị suy giảm, sụt giảm (adj/v)' }
      ],
      quiz: [
        { question: 'How have social platforms affected youth communication?', options: ['Revolutionized communication & connectivity', 'Made it completely impossible', 'Replaced all school teachers', 'Caused total silence'], correct: 0 },
        { question: 'What positive aspect of digital tools is mentioned?', options: ['Instant knowledge exchange', 'Cheaper smartphones', 'Free video games', 'Automatic exam grading'], correct: 0 },
        { question: 'What major concern do psychologists express?', options: ['Digital addiction & reduced sleep quality', 'High cost of mobile data', 'Overweight luggage', 'Lack of electricity'], correct: 0 },
        { question: 'What is excessive screen time correlated with?', options: ['Diminished concentration spans & anxiety', 'Better eyesight', 'Improved sleep patterns', 'Mastery of languages'], correct: 0 },
        { question: 'What is the overarching tone of the passage?', options: ['Balanced and analytical', 'Extremely aggressive', 'Purely humorous', 'Completely fictional'], correct: 0 }
      ],
      likes: 27,
      comments: [{ id: 'c4', author: 'Minh Anh', text: 'Chủ đề B1 này rất hay xuất hiện trong bài thi IELTS Reading!', date: 'Hôm qua' }]
    },
    {
      id: 'ielts_b1_listen',
      mode: 'ielts',
      level: 'B1',
      skill: 'listening',
      title: 'IELTS B1: Modern E-Learning and Digital Classrooms',
      creator: 'Thầy Viết Kha',
      creatorId: 'u_admin',
      tag: 'Giáo dục',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'The transition towards digital learning environments has gained unprecedented momentum globally. Online educational portals provide learners with personalized study schedules, on-demand video lectures, and immediate feedback through automated quizzes. Nevertheless, educators stress that self-discipline and time management remain paramount attributes for achieving tangible academic success in virtual courses.',
      summary: 'Bài nghe học thuật về xu hướng lớp học số hóa, ưu điểm học mọi lúc mọi nơi và tầm quan trọng của kỷ luật tự giác.',
      vocab: [
        { word: 'Unprecedented', meaning: 'chưa từng có tiền lệ (adj)' },
        { word: 'Momentum', meaning: 'đà phát triển, xung lực (n)' },
        { word: 'Paramount', meaning: 'tối quan trọng, hàng đầu (adj)' },
        { word: 'Tangible', meaning: 'rõ ràng, cụ thể, thực tế (adj)' },
        { word: 'Attributes', meaning: 'phẩm chất, đặc tính (n)' }
      ],
      quiz: [
        { question: 'What has gained unprecedented momentum worldwide?', options: ['Transition towards digital learning', 'Traditional blackboard manufacturing', 'Handwritten letter delivery', 'Printing paper textbooks'], correct: 0 },
        { question: 'What key features do online portals offer learners?', options: ['Personalized schedules & instant feedback', 'Free meals', 'Guaranteed diplomas without study', 'Unlimited video games'], correct: 0 },
        { question: 'What attributes do educators emphasize as paramount?', options: ['Self-discipline & time management', 'Having the most expensive laptop', 'Memorizing everything blindly', 'Studying only before exams'], correct: 0 },
        { question: 'How do automated quizzes assist learners?', options: ['Provide immediate performance feedback', 'Delete mistakes automatically', 'Lower final grades', 'Replace teacher salaries'], correct: 0 },
        { question: 'What is required to achieve tangible success online?', options: ['Consistent personal discipline', 'Relying only on luck', 'Copying friends\' homework', 'Skipping video lectures'], correct: 0 }
      ],
      likes: 18,
      comments: []
    },

    // ── BAND B2 ──
    {
      id: 'ielts_b2_read',
      mode: 'ielts',
      level: 'B2',
      skill: 'reading',
      title: 'IELTS B2: Global Climate Crisis & Renewable Transition',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Môi trường',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Anthropogenic climate change represents arguably the most profound existential challenge confronting modern civilization. Decades of heavy reliance on fossil fuels have precipitated unprecedented increases in greenhouse gas concentrations. Transitioning toward renewable alternatives—principally photovoltaic solar arrays, offshore wind turbines, and advanced hydroelectric generation—is essential to achieve carbon neutrality and mitigate catastrophic meteorological anomalies.',
      summary: 'Bài đọc chuyên sâu chuẩn IELTS B2 (5.5 - 6.5) phân tích nguyên nhân biến đổi khí hậu và tính cấp bách của chuyển dịch sang năng lượng tái tạo.',
      vocab: [
        { word: 'Anthropogenic', meaning: 'bắt nguồn từ hoạt động con người (adj)' },
        { word: 'Precipitated', meaning: 'làm gia tăng nhanh, thúc đẩy (v)' },
        { word: 'Photovoltaic', meaning: 'quang điện mặt trời (adj)' },
        { word: 'Neutrality', meaning: 'sự trung hòa carbon (n)' },
        { word: 'Anomalies', meaning: 'sự bất thường, dị thường thời tiết (n)' }
      ],
      quiz: [
        { question: 'What does "anthropogenic" mean in the context?', options: ['Caused by human activities', 'Occurring naturally in space', 'Resulting from volcanic eruptions', 'Caused by ocean tides'], correct: 0 },
        { question: 'What has heavy reliance on fossil fuels precipitated?', options: ['Unprecedented rise in greenhouse gases', 'Lower global temperatures', 'Decrease in atmospheric carbon', 'Expansion of glaciers'], correct: 0 },
        { question: 'Which renewable alternatives are specifically mentioned?', options: ['Solar arrays, wind turbines & hydro', 'Coal and natural gas', 'Nuclear weapons', 'Diesel generators'], correct: 0 },
        { question: 'What is the primary objective of the green transition?', options: ['Achieve carbon neutrality & mitigate disasters', 'Increase oil prices', 'Stop all factory production', 'Ban international travel'], correct: 0 },
        { question: 'What does the term "anomalies" refer to?', options: ['Irregular and severe weather events', 'Regular daily rain', 'Normal sunny afternoons', 'Seasonal winter snow'], correct: 0 }
      ],
      likes: 31,
      comments: []
    },
    {
      id: 'ielts_b2_listen',
      mode: 'ielts',
      level: 'B2',
      skill: 'listening',
      title: 'IELTS B2: Urbanization and Sustainable Smart Cities',
      creator: 'Thầy Viết Kha',
      creatorId: 'u_admin',
      tag: 'Công nghệ',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Rapid demographic migration towards metropolitan conglomerates has exerted immense strain on existing municipal infrastructure. In response, urban planners are pioneering the concept of "Smart Cities" integrated with Internet-of-Things (IoT) sensor networks. These intelligent ecosystems optimize municipal traffic flows, reduce carbon footprints via automated public transit, and enhance waste management efficiency through predictive data analytics.',
      summary: 'Bài nghe thảo luận về áp lực đô thị hóa và giải pháp phát triển các thành phố thông minh dựa trên cảm biến IoT và phân tích dữ liệu.',
      vocab: [
        { word: 'Demographic', meaning: 'thuộc về nhân khẩu học (adj)' },
        { word: 'Conglomerates', meaning: 'đại đô thị, tập hợp đô thị (n)' },
        { word: 'Municipal', meaning: 'thuộc về chính quyền đô thị (adj)' },
        { word: 'Ecosystems', meaning: 'hệ sinh thái thông minh (n)' },
        { word: 'Predictive', meaning: 'có tính dự đoán phân tích (adj)' }
      ],
      quiz: [
        { question: 'What phenomenon has strained municipal infrastructure?', options: ['Rapid demographic migration to cities', 'Decline in city populations', 'Decrease in vehicle ownership', 'Expansion of rural farming'], correct: 0 },
        { question: 'What technology forms the backbone of Smart Cities?', options: ['IoT sensor networks and data analytics', 'Manual paper ledgers', 'Steam locomotives', 'Typewriters'], correct: 0 },
        { question: 'How do intelligent ecosystems optimize urban living?', options: ['Optimize traffic flows & reduce carbon emissions', 'Increase highway congestion', 'Cut off public water supplies', 'Encourage fossil fuel burning'], correct: 0 },
        { question: 'What is enhanced through predictive data analytics?', options: ['Waste management efficiency', 'Air pollution rates', 'Traffic accidents', 'Garbage accumulation'], correct: 0 },
        { question: 'What role does automated public transit play?', options: ['Reduces citywide carbon footprints', 'Slows down daily commutes', 'Increases bus ticket prices ten times', 'Requires manual train drivers'], correct: 0 }
      ],
      likes: 22,
      comments: []
    },

    // ── BAND C1 ──
    {
      id: 'ielts_c1_read',
      mode: 'ielts',
      level: 'C1',
      skill: 'reading',
      title: 'IELTS C1: Artificial Intelligence & Algorithmic Ethics',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Công nghệ',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'The proliferation of generative artificial intelligence and deep neural networks has engendered a profound paradigm shift across intellectual and commercial domains. Beyond automation of cognitive tasks, sophisticated algorithmic architectures raise acute bioethical and socio-economic dilemmas. Issues encompassing non-transparent black-box decision systems, epistemic biases embedded within training corpora, and prospective displacement of white-collar workforces necessitate rigorous multilateral regulatory governance frameworks.',
      summary: 'Bài đọc học thuật cấp độ C1 (IELTS 7.0 - 8.0) đi sâu vào các vấn đề đạo đức của trí tuệ nhân tạo, tính minh bạch của thuật toán hộp đen và khuôn khổ pháp lý quốc tế.',
      vocab: [
        { word: 'Proliferation', meaning: 'sự bùng nổ, gia tăng nhanh chóng (n)' },
        { word: 'Engendered', meaning: 'làm nảy sinh, khởi phát (v)' },
        { word: 'Paradigm shift', meaning: 'bước chuyển dịch hệ hình tư duy (n)' },
        { word: 'Epistemic', meaning: 'thuộc về nhận thức luận, tri thức (adj)' },
        { word: 'Multilateral', meaning: 'đa phương mang tính quốc tế (adj)' }
      ],
      quiz: [
        { question: 'What has generative AI engendered across multiple domains?', options: ['A profound paradigm shift', 'No noticeable difference', 'A complete cessation of computing', 'Immediate economic collapse'], correct: 0 },
        { question: 'What is a major ethical dilemma regarding algorithmic architectures?', options: ['Non-transparent black-box decision making', 'Excessive color brightness on screens', 'Too many USB cables required', 'Fast download speeds'], correct: 0 },
        { question: 'Where do epistemic biases in AI models originate?', options: ['Embedded within training corpora', 'From hardware cooling fans', 'From external monitor glass', 'From keyboards'], correct: 0 },
        { question: 'Which segment of the workforce faces prospective displacement?', options: ['White-collar professional workforces', 'Only agricultural manual laborers', 'Maritime fishermen exclusively', 'None whatsoever'], correct: 0 },
        { question: 'What solution does the author advocate to address AI risks?', options: ['Rigorous multilateral regulatory frameworks', 'Complete global shutdown of internet', 'Leaving algorithms completely unregulated', 'Banning all computers'], correct: 0 }
      ],
      likes: 36,
      comments: [{ id: 'c5', author: 'Tuấn Kiệt', text: 'Từ vựng C1 rất đỉnh cao, chuẩn đề thi thật IELTS Academic!', date: 'Hôm nay' }]
    },
    {
      id: 'ielts_c1_listen',
      mode: 'ielts',
      level: 'C1',
      skill: 'listening',
      title: 'IELTS C1: Bioethics, CRISPR, and Genomic Editing Frontiers',
      creator: 'Thầy Viết Kha',
      creatorId: 'u_admin',
      tag: 'Môi trường',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'Recent breakthroughs in clustered regularly interspaced short palindromic repeats—commonly termed CRISPR-Cas9—have democratized precision genome editing. While this revolutionary biomedical apparatus heralds transformative therapeutics for congenital pathologies, it simultaneously precipitates contentious metaphysical debates regarding germline modifications, eugenic stratification, and equitable global access to therapeutic interventions.',
      summary: 'Bài nghe nâng cao về công nghệ chỉnh sửa gen CRISPR-Cas9, triển vọng trị liệu bệnh di truyền và các tranh cãi đạo đức sinh học mang tính toàn cầu.',
      vocab: [
        { word: 'Democratized', meaning: 'phổ cập hóa, làm cho dễ tiếp cận hơn (v)' },
        { word: 'Congenital', meaning: 'bẩm sinh, có từ lúc lọt lòng (adj)' },
        { word: 'Pathologies', meaning: 'bệnh lý học, các loại bệnh tật (n)' },
        { word: 'Precipitates', meaning: 'khơi mào, thúc đẩy tranh cãi (v)' },
        { word: 'Stratification', meaning: 'sự phân tầng xã hội sâu sắc (n)' }
      ],
      quiz: [
        { question: 'What has the CRISPR-Cas9 system revolutionized?', options: ['Precision genome editing', 'Nuclear energy synthesis', 'Oil extraction technologies', 'Satellite rocketry'], correct: 0 },
        { question: 'What promising medical potential does CRISPR offer?', options: ['Transformative therapeutics for congenital diseases', 'Instant cosmetic alterations', 'Cheap eyeglasses production', 'Faster muscle massage'], correct: 0 },
        { question: 'What contentious ethical debate is provoked by germline editing?', options: ['Eugenic stratification and equitable access', 'Cost of hospital beds', 'Nurse uniform designs', 'Parking space at clinics'], correct: 0 },
        { question: 'What does "congenital pathologies" refer to?', options: ['Genetic disorders present from birth', 'Common seasonal colds', 'Broken bones from sports', 'Tiredness after travel'], correct: 0 },
        { question: 'What is a primary concern regarding genetic therapy access?', options: ['Ensuring equitable global distribution', 'Selling therapies only to billionaires', 'Preventing doctors from using microscopes', 'Restricting medical textbooks'], correct: 0 }
      ],
      likes: 24,
      comments: []
    },

    // ── BAND C2 ──
    {
      id: 'ielts_c2_read',
      mode: 'ielts',
      level: 'C2',
      skill: 'reading',
      title: 'IELTS C2: Epistemological Paradigms & Quantum Mechanics',
      creator: 'Nguyễn Viết Kha (Biên soạn)',
      creatorId: 'u_admin',
      tag: 'Giáo dục',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'The advent of quantum mechanics fundamentally dismantled the deterministic epistemology that undergirded classical Newtonian mechanics. The Copenhagen interpretation, bolstered by Heisenberg\'s uncertainty principle and wave-particle duality, posits that reality at subatomic dimensions is intrinsically probabilistic rather than definitively deterministic. This ontological upheaval reverberated far beyond theoretical physics, compelling epistemologists to re-evaluate the categorical tenability of empiricism and the nature of observer-dependent reality.',
      summary: 'Kiệt tác học thuật Band C2 (IELTS 8.5 - 9.0): Sự lật đổ của cơ học lượng tử đối với thuyết định mệnh Newton và bước chuyển dịch trong nhận thức luận triết học.',
      vocab: [
        { word: 'Epistemology', meaning: 'nhận thức luận triết học (n)' },
        { word: 'Deterministic', meaning: 'mang tính quyết định luận (adj)' },
        { word: 'Ontological', meaning: 'thuộc về bản thể luận (adj)' },
        { word: 'Reverberated', meaning: 'lan tỏa, vang dội sâu sắc (v)' },
        { word: 'Tenability', meaning: 'tính vững chắc, có thể bảo vệ được (n)' }
      ],
      quiz: [
        { question: 'What did quantum mechanics fundamentally dismantle?', options: ['Deterministic Newtonian epistemology', 'The entire theory of gravitation', 'Chemical bonding rules', 'Mathematical multiplication'], correct: 0 },
        { question: 'According to the Copenhagen interpretation, how does subatomic reality behave?', options: ['Intrinsically probabilistic', 'Definitively deterministic', 'Completely static and frozen', 'Predictable with clockwork precision'], correct: 0 },
        { question: 'What key principle was articulated by Heisenberg?', options: ['The uncertainty principle', 'The law of thermal expansion', 'The principle of lever moments', 'The buoyancy equation'], correct: 0 },
        { question: 'Where did this ontological upheaval have significant repercussions?', options: ['Across philosophy and empirical theory', 'Only inside high school chemistry labs', 'Exclusively in automotive mechanics', 'In agricultural farming schedules'], correct: 0 },
        { question: 'What question does observer-dependent reality raise for empiricism?', options: ['Re-evaluates the tenability of objective observation', 'Proves all observations are perfect', 'Disproves the existence of mathematics', 'Confirms absolute Newtonian space'], correct: 0 }
      ],
      likes: 42,
      comments: [{ id: 'c6', author: 'Nguyễn Viết Kha', text: 'Bài đọc chuẩn mực cho những ai hướng tới Band 8.5 - 9.0!', date: 'Vừa xong' }]
    },
    {
      id: 'ielts_c2_listen',
      mode: 'ielts',
      level: 'C2',
      skill: 'listening',
      title: 'IELTS C2: Cognitive Semantics & Linguistic Relativity in Diplomacy',
      creator: 'Thầy Viết Kha',
      creatorId: 'u_admin',
      tag: 'Giáo dục',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      originalContent: 'In multilateral diplomatic negotiations, the Sapir-Whorf hypothesis regarding linguistic relativity transcends academic abstraction to exert tangible geopolitical consequences. Cognitive semanticists demonstrate that syntactic structures and lexical connotations subtly frame conceptual metaphors, predetermining diplomatic concessions or ideological impasses. Masterful statecraft thus necessitates an acute hermeneutic sensitivity to culturally contingent semantic nuances.',
      summary: 'Bài nghe thượng thừa Band C2 về ngữ nghĩa học nhận thức, thuyết tương đối ngôn ngữ và nghệ thuật ngoại giao quốc tế đỉnh cao.',
      vocab: [
        { word: 'Relativity', meaning: 'tính tương đối của ngôn ngữ (n)' },
        { word: 'Impasses', meaning: 'bế tắc trong đàm phán ngoại giao (n)' },
        { word: 'Hermeneutic', meaning: 'thuộc về thông diễn học (adj)' },
        { word: 'Contingent', meaning: 'phụ thuộc theo điều kiện/văn hóa (adj)' },
        { word: 'Statecraft', meaning: 'nghệ thuật trị quốc, tài ngoại giao (n)' }
      ],
      quiz: [
        { question: 'What hypothesis is discussed in the context of diplomacy?', options: ['Sapir-Whorf linguistic relativity', 'Darwinian evolutionary adaptation', 'Keplerian planetary orbital laws', 'Plate tectonics theory'], correct: 0 },
        { question: 'How do syntactic structures influence negotiations?', options: ['Frame conceptual metaphors and concessions', 'Have zero effect on agreements', 'Force translators to use dictionaries', 'Speed up typing speed only'], correct: 0 },
        { question: 'What does masterful statecraft necessitate according to the text?', options: ['Acute sensitivity to semantic nuances', 'Military aggression exclusively', 'Ignoring foreign cultural contexts', 'Refusing all communication'], correct: 0 },
        { question: 'What is an "impasse" in diplomatic negotiations?', options: ['A deadlock where progress is blocked', 'A celebration banquet', 'A signed peace accord', 'A formal greeting ceremony'], correct: 0 },
        { question: 'What do cognitive semanticists study in this domain?', options: ['How language frames thinking and diplomacy', 'How vocal cords vibrate physically', 'How grammar books are printed', 'How alphabets were invented'], correct: 0 }
      ],
      likes: 38,
      comments: []
    }
  ]
};
