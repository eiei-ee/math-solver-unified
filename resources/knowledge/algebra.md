# 代数 — 方程与不等式

## 一元二次方程

标准形式：$ax^2 + bx + c = 0 \quad (a \neq 0)$

求根公式：
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

判别式 $\Delta = b^2 - 4ac$：
- $\Delta > 0$：两个不等实根
- $\Delta = 0$：两个相等实根（重根）
- $\Delta < 0$：无实根，有共轭复根

### 韦达定理
若 $x_1, x_2$ 是 $ax^2 + bx + c = 0$ 的两根，则：
$$x_1 + x_2 = -\frac{b}{a}, \quad x_1 x_2 = \frac{c}{a}$$

### 配方法
$$ax^2 + bx + c = a\left(x + \frac{b}{2a}\right)^2 - \frac{b^2 - 4ac}{4a}$$

## 不等式

### 均值不等式
$$\frac{a_1 + a_2 + \cdots + a_n}{n} \geq \sqrt[n]{a_1 a_2 \cdots a_n}$$

当且仅当 $a_1 = a_2 = \cdots = a_n$ 时取等号。

### 柯西不等式
$$(a_1^2 + a_2^2)(b_1^2 + b_2^2) \geq (a_1b_1 + a_2b_2)^2$$

### 一元二次不等式
$ax^2 + bx + c > 0$（$a > 0$）的解：
- $\Delta < 0$：$x \in \mathbb{R}$（恒成立）
- $\Delta = 0$：$x \neq -\frac{b}{2a}$
- $\Delta > 0$：$x < x_1$ 或 $x > x_2$（两根之外）

## 指数与对数

### 指数运算
- $a^m \cdot a^n = a^{m+n}$
- $(a^m)^n = a^{mn}$
- $a^0 = 1 \quad (a \neq 0)$
- $a^{-n} = \frac{1}{a^n}$

### 对数运算
- $\log_a(MN) = \log_a M + \log_a N$
- $\log_a\frac{M}{N} = \log_a M - \log_a N$
- $\log_a M^n = n\log_a M$
- 换底公式：$\log_a b = \frac{\log_c b}{\log_c a}$

## 数列

### 等差数列
- 通项：$a_n = a_1 + (n-1)d$
- 前 $n$ 项和：$S_n = \frac{n(a_1 + a_n)}{2} = na_1 + \frac{n(n-1)}{2}d$

### 等比数列
- 通项：$a_n = a_1 q^{n-1}$
- 前 $n$ 项和：$S_n = \frac{a_1(1-q^n)}{1-q} \quad (q \neq 1)$
- 无穷递缩等比数列和：$S = \frac{a_1}{1-q} \quad (|q| < 1)$
