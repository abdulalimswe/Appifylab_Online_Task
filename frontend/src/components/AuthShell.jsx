import { Link } from "react-router-dom";

const SHAPE_IMAGES = [
  ["shape1.svg", "dark_shape.svg"],
  ["shape2.svg", "dark_shape1.svg"],
  ["shape3.svg", "dark_shape2.svg"]
];

const SHAPE_CLASS_NAMES = ["_shape_one", "_shape_two", "_shape_three"];

function ShapeStack({ isLogin }) {
  return SHAPE_IMAGES.map((entry, originalIndex) => ({ entry, originalIndex }))
    .filter(({ originalIndex }) => !(isLogin && originalIndex === 0))
    .map(({ entry: [shape, darkShape], originalIndex }) => (
      <div className={SHAPE_CLASS_NAMES[originalIndex]} key={shape}>
        <img src={`/assets/images/${shape}`} alt="" className="_shape_img" />
        <img
          src={`/assets/images/${darkShape}`}
          alt=""
          className={`_dark_shape ${originalIndex > 0 ? "_dark_shape_opacity" : ""}`.trim()}
        />
      </div>
    ));
}

export default function AuthShell({
  variant,
  image,
  darkImage,
  imageAlt,
  logo,
  eyebrow,
  title,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  children
}) {
  const isLogin = variant === "login";

  return (
    <main className={`${isLogin ? "_social_login_wrapper" : "_social_registration_wrapper"} _layout_main_wrapper auth-shell`}>
      <ShapeStack isLogin={isLogin} />
      <div className={isLogin ? "_social_login_wrap" : "_social_registration_wrap"}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className={isLogin ? "_social_login_left" : "_social_registration_right"}>
                <div className={isLogin ? "_social_login_left_image" : "_social_registration_right_image"}>
                  <img
                    src={image}
                    alt={imageAlt}
                    className={isLogin ? "_left_img" : ""}
                  />
                </div>
                {!isLogin && darkImage ? (
                  <div className="_social_registration_right_image_dark">
                    <img src={darkImage} alt="" />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className={isLogin ? "_social_login_content" : "_social_registration_content"}>
                <div className={isLogin ? "_social_login_left_logo _mar_b28" : "_social_registration_right_logo _mar_b28"}>
                  <Link to="/login" aria-label="Home">
                    <img src={logo} alt="Buddy Script" className={isLogin ? "_left_logo" : "_right_logo"} />
                  </Link>
                </div>
                <p className={isLogin ? "_social_login_content_para _mar_b8" : "_social_registration_content_para _mar_b8"}>
                  {eyebrow}
                </p>
                <h1 className={isLogin ? "_social_login_content_title _titl4 _mar_b50" : "_social_registration_content_title _titl4 _mar_b50"}>
                  {title}
                </h1>
                {children}
                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className={isLogin ? "_social_login_bottom_txt" : "_social_registration_bottom_txt"}>
                      <p className={isLogin ? "_social_login_bottom_txt_para" : "_social_registration_bottom_txt_para"}>
                        {footerText} <Link to={footerLinkTo}>{footerLinkLabel}</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

